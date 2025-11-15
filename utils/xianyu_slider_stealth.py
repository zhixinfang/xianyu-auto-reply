#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
闲鱼滑块验证 - 增强反检测版本
基于最新的反检测技术，专门针对闲鱼、淘宝、阿里平台的滑块验证
"""

import time
import random
import json
import os
import math
import threading
import tempfile
import shutil
from datetime import datetime
from playwright.sync_api import sync_playwright, ElementHandle
from typing import Optional, Tuple, List, Dict, Any
from loguru import logger
from collections import defaultdict

# 导入配置
try:
    from config import SLIDER_VERIFICATION
    SLIDER_MAX_CONCURRENT = SLIDER_VERIFICATION.get('max_concurrent', 3)
    SLIDER_WAIT_TIMEOUT = SLIDER_VERIFICATION.get('wait_timeout', 60)
except ImportError:
    # 如果无法导入配置，使用默认值
    SLIDER_MAX_CONCURRENT = 3
    SLIDER_WAIT_TIMEOUT = 60

# 使用loguru日志库，与主程序保持一致

# 全局并发控制
class SliderConcurrencyManager:
    """滑块验证并发管理器"""
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.max_concurrent = SLIDER_MAX_CONCURRENT  # 从配置文件读取最大并发数
            self.wait_timeout = SLIDER_WAIT_TIMEOUT  # 从配置文件读取等待超时时间
            self.active_instances = {}  # 活跃实例
            self.waiting_queue = []  # 等待队列
            self.instance_lock = threading.Lock()
            self._initialized = True
            logger.info(f"滑块验证并发管理器初始化: 最大并发数={self.max_concurrent}, 等待超时={self.wait_timeout}秒")
    
    def can_start_instance(self, user_id: str) -> bool:
        """检查是否可以启动新实例"""
        with self.instance_lock:
            return len(self.active_instances) < self.max_concurrent
    
    def wait_for_slot(self, user_id: str, timeout: int = None) -> bool:
        """等待可用槽位"""
        if timeout is None:
            timeout = self.wait_timeout
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            with self.instance_lock:
                if len(self.active_instances) < self.max_concurrent:
                    return True
            
            # 检查是否在等待队列中
            with self.instance_lock:
                if user_id not in self.waiting_queue:
                    self.waiting_queue.append(user_id)
                    # 提取纯用户ID用于日志显示
                    pure_user_id = self._extract_pure_user_id(user_id)
                    logger.info(f"【{pure_user_id}】进入等待队列，当前队列长度: {len(self.waiting_queue)}")
            
            # 等待1秒后重试
            time.sleep(1)
        
        # 超时后从队列中移除
        with self.instance_lock:
            if user_id in self.waiting_queue:
                self.waiting_queue.remove(user_id)
                # 提取纯用户ID用于日志显示
                pure_user_id = self._extract_pure_user_id(user_id)
                logger.warning(f"【{pure_user_id}】等待超时，从队列中移除")
        
        return False
    
    def register_instance(self, user_id: str, instance):
        """注册实例"""
        with self.instance_lock:
            self.active_instances[user_id] = {
                'instance': instance,
                'start_time': time.time()
            }
            # 从等待队列中移除
            if user_id in self.waiting_queue:
                self.waiting_queue.remove(user_id)
    
    def unregister_instance(self, user_id: str):
        """注销实例"""
        with self.instance_lock:
            if user_id in self.active_instances:
                del self.active_instances[user_id]
                # 提取纯用户ID用于日志显示
                pure_user_id = self._extract_pure_user_id(user_id)
                logger.info(f"【{pure_user_id}】实例已注销，当前活跃: {len(self.active_instances)}")
    
    def _extract_pure_user_id(self, user_id: str) -> str:
        """提取纯用户ID（移除时间戳部分）"""
        if '_' in user_id:
            # 检查最后一部分是否为数字（时间戳）
            parts = user_id.split('_')
            if len(parts) >= 2 and parts[-1].isdigit() and len(parts[-1]) >= 10:
                # 最后一部分是时间戳，移除它
                return '_'.join(parts[:-1])
            else:
                # 不是时间戳格式，使用原始ID
                return user_id
        else:
            # 没有下划线，直接使用
            return user_id
    
    def get_stats(self):
        """获取统计信息"""
        with self.instance_lock:
            return {
                'active_count': len(self.active_instances),
                'max_concurrent': self.max_concurrent,
                'available_slots': self.max_concurrent - len(self.active_instances),
                'queue_length': len(self.waiting_queue),
                'waiting_users': self.waiting_queue.copy()
            }

# 全局并发管理器实例
concurrency_manager = SliderConcurrencyManager()

# 策略统计管理器
class RetryStrategyStats:
    """重试策略成功率统计管理器"""
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.stats_lock = threading.Lock()
            self.strategy_stats = {
                'attempt_1_default': {'total': 0, 'success': 0, 'fail': 0},
                'attempt_2_cautious': {'total': 0, 'success': 0, 'fail': 0},
                'attempt_3_fast': {'total': 0, 'success': 0, 'fail': 0},
                'attempt_3_slow': {'total': 0, 'success': 0, 'fail': 0},
            }
            self.stats_file = 'trajectory_history/strategy_stats.json'
            self._load_stats()
            self._initialized = True
            logger.info("策略统计管理器初始化完成")
    
    def _load_stats(self):
        """从文件加载统计数据"""
        try:
            if os.path.exists(self.stats_file):
                with open(self.stats_file, 'r', encoding='utf-8') as f:
                    loaded_stats = json.load(f)
                    self.strategy_stats.update(loaded_stats)
                logger.info(f"已加载历史策略统计数据: {self.stats_file}")
        except Exception as e:
            logger.warning(f"加载策略统计数据失败: {e}")
    
    def _save_stats(self):
        """保存统计数据到文件"""
        try:
            os.makedirs(os.path.dirname(self.stats_file), exist_ok=True)
            with open(self.stats_file, 'w', encoding='utf-8') as f:
                json.dump(self.strategy_stats, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"保存策略统计数据失败: {e}")
    
    def record_attempt(self, attempt: int, strategy_type: str, success: bool):
        """记录一次尝试结果
        
        Args:
            attempt: 尝试次数 (1, 2, 3)
            strategy_type: 策略类型 ('default', 'cautious', 'fast', 'slow')
            success: 是否成功
        """
        with self.stats_lock:
            key = f'attempt_{attempt}_{strategy_type}'
            if key not in self.strategy_stats:
                self.strategy_stats[key] = {'total': 0, 'success': 0, 'fail': 0}
            
            self.strategy_stats[key]['total'] += 1
            if success:
                self.strategy_stats[key]['success'] += 1
            else:
                self.strategy_stats[key]['fail'] += 1
            
            # 每次记录后保存
            self._save_stats()
    
    def get_stats_summary(self):
        """获取统计摘要"""
        with self.stats_lock:
            summary = {}
            for key, stats in self.strategy_stats.items():
                if stats['total'] > 0:
                    success_rate = (stats['success'] / stats['total']) * 100
                    summary[key] = {
                        'total': stats['total'],
                        'success': stats['success'],
                        'fail': stats['fail'],
                        'success_rate': f"{success_rate:.2f}%"
                    }
            return summary
    
    def log_summary(self):
        """输出统计摘要到日志"""
        summary = self.get_stats_summary()
        if summary:
            logger.info("=" * 60)
            logger.info("📊 重试策略成功率统计")
            logger.info("=" * 60)
            for key, stats in summary.items():
                logger.info(f"{key:25s} | 总计:{stats['total']:4d} | 成功:{stats['success']:4d} | 失败:{stats['fail']:4d} | 成功率:{stats['success_rate']}")
            logger.info("=" * 60)

# 全局策略统计实例
strategy_stats = RetryStrategyStats()

class XianyuSliderStealth:
    
    def __init__(self, user_id: str = "default", enable_learning: bool = True, headless: bool = True):
        self.user_id = user_id
        self.enable_learning = enable_learning
        self.headless = headless  # 是否使用无头模式
        self.browser = None
        self.page = None
        self.context = None
        self.playwright = None
        
        # 提取纯用户ID（移除时间戳部分）
        self.pure_user_id = concurrency_manager._extract_pure_user_id(user_id)
        
        # 检查日期限制
        if not self._check_date_validity():
            raise Exception(f"【{self.pure_user_id}】日期验证失败，功能已过期")
        
        # 为每个实例创建独立的临时目录
        self.temp_dir = tempfile.mkdtemp(prefix=f"slider_{user_id}_")
        logger.debug(f"【{self.pure_user_id}】创建临时目录: {self.temp_dir}")
        
        # 等待可用槽位（排队机制）
        logger.info(f"【{self.pure_user_id}】检查并发限制...")
        if not concurrency_manager.wait_for_slot(self.user_id):
            stats = concurrency_manager.get_stats()
            logger.error(f"【{self.pure_user_id}】等待槽位超时，当前活跃: {stats['active_count']}/{stats['max_concurrent']}")
            raise Exception(f"滑块验证等待槽位超时，请稍后重试")
        
        # 注册实例
        concurrency_manager.register_instance(self.user_id, self)
        stats = concurrency_manager.get_stats()
        logger.info(f"【{self.pure_user_id}】实例已注册，当前并发: {stats['active_count']}/{stats['max_concurrent']}")
        
        # 轨迹学习相关属性
        
        self.success_history_file = f"trajectory_history/{self.pure_user_id}_success.json"
        self.trajectory_params = {
            "total_steps_range": [5, 8],  # 极速：5-8步（超快滑动）
            "base_delay_range": [0.0002, 0.0005],  # 极速：0.2-0.5ms延迟
            "jitter_x_range": [0, 1],  # 极小抖动
            "jitter_y_range": [0, 1],  # 极小抖动
            "slow_factor_range": [10, 15],  # 极快加速因子
            "acceleration_phase": 1.0,  # 全程加速
            "fast_phase": 1.0,  # 无慢速
            "slow_start_ratio_base": 2.0,  # 确保超调100%
            "completion_usage_rate": 0.05,  # 极少补全使用率
            "avg_completion_steps": 1.0,  # 极少补全步数
            "trajectory_length_stats": [],
            "learning_enabled": False
        }
        
        # 保存最后一次使用的轨迹参数（用于分析优化）
        self.last_trajectory_params = {}
    
    def _check_date_validity(self) -> bool:
        """检查日期有效性
        
        Returns:
            bool: 如果当前日期小于 2025-11-30 返回 True，否则返回 False
        """
        try:
            # 设置截止日期
            expiry_date = datetime(2025, 12, 30)
            current_date = datetime.now()
            
            # 计算剩余天数
            remaining_days = (expiry_date - current_date).days
            
            if current_date < expiry_date:
                logger.info(f"【{self.pure_user_id}】日期验证通过，剩余可用天数: {remaining_days} 天")
                return True
            else:
                logger.error(f"【{self.pure_user_id}】日期验证失败！当前日期: {current_date.strftime('%Y-%m-%d')}, "
                           f"截止日期: {expiry_date.strftime('%Y-%m-%d')}, "
                           f"已过期: {abs(remaining_days)} 天")
                return False
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】日期验证出错: {str(e)}")
            return False
        
    def init_browser(self):
        """初始化浏览器 - 增强反检测版本"""
        try:
            # 启动 Playwright
            logger.info(f"【{self.pure_user_id}】启动Playwright...")
            self.playwright = sync_playwright().start()
            logger.info(f"【{self.pure_user_id}】Playwright启动成功")
            
            # 随机选择浏览器特征
            browser_features = self._get_random_browser_features()
            
            # 启动浏览器，使用随机特征
            logger.info(f"【{self.pure_user_id}】启动浏览器，headless模式: {self.headless}")
            self.browser = self.playwright.chromium.launch(
                headless=self.headless,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-gpu",
                    "--disable-web-security",
                    "--disable-features=VizDisplayCompositor",
                    "--start-maximized",  # 窗口最大化
                    f"--window-size={browser_features['window_size']}",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-renderer-backgrounding",
                    f"--lang={browser_features['lang']}",
                    f"--accept-lang={browser_features['accept_lang']}",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-extensions",
                    "--disable-plugins",
                    "--disable-default-apps",
                    "--disable-sync",
                    "--disable-translate",
                    "--hide-scrollbars",
                    "--mute-audio",
                    "--no-default-browser-check",
                    "--disable-logging",
                    "--disable-permissions-api",
                    "--disable-notifications",
                    "--disable-popup-blocking",
                    "--disable-prompt-on-repost",
                    "--disable-hang-monitor",
                    "--disable-client-side-phishing-detection",
                    "--disable-component-extensions-with-background-pages",
                    "--disable-background-mode",
                    "--disable-domain-reliability",
                    "--disable-features=TranslateUI",
                    "--disable-ipc-flooding-protection",
                    "--disable-field-trial-config",
                    "--disable-background-networking",
                    "--disable-back-forward-cache",
                    "--disable-breakpad",
                    "--disable-component-update",
                    "--force-color-profile=srgb",
                    "--metrics-recording-only",
                    "--password-store=basic",
                    "--use-mock-keychain",
                    "--no-service-autorun",
                    "--export-tagged-pdf",
                    "--disable-search-engine-choice-screen",
                    "--unsafely-disable-devtools-self-xss-warnings",
                    "--edge-skip-compat-layer-relaunch",
                    "--allow-pre-commit-input"
                ]
            )
            
            # 验证浏览器已启动
            if not self.browser or not self.browser.is_connected():
                raise Exception("浏览器启动失败或连接已断开")
            logger.info(f"【{self.pure_user_id}】浏览器启动成功，已连接: {self.browser.is_connected()}")
            
            # 创建上下文，使用随机特征
            logger.info(f"【{self.pure_user_id}】创建浏览器上下文...")
            
            # 🔑 关键优化：添加更多真实浏览器特征
            context_options = {
                'user_agent': browser_features['user_agent'],
                'locale': browser_features['locale'],
                'timezone_id': browser_features['timezone_id'],
                # 🔑 添加真实的权限设置
                'permissions': ['geolocation', 'notifications'],
                # 🔑 添加真实的色彩方案
                'color_scheme': random.choice(['light', 'dark', 'no-preference']),
                # 🔑 添加HTTP凭据
                'http_credentials': None,
                # 🔑 忽略HTTPS错误（某些情况下更真实）
                'ignore_https_errors': False,
            }
            
            # 根据模式配置viewport和no_viewport
            if not self.headless:
                # 有头模式：使用 no_viewport=True 支持窗口最大化
                # 注意：使用no_viewport时，不能设置device_scale_factor、is_mobile、has_touch
                context_options['no_viewport'] = True  # 移除viewport限制，支持--start-maximized
                self.context = self.browser.new_context(**context_options)
            else:
                # 无头模式：使用固定viewport
                context_options.update({
                    'viewport': {'width': browser_features['viewport_width'], 'height': browser_features['viewport_height']},
                    'device_scale_factor': browser_features['device_scale_factor'],
                    'is_mobile': browser_features['is_mobile'],
                    'has_touch': browser_features['has_touch'],
                })
                self.context = self.browser.new_context(**context_options)
            
            # 验证上下文已创建
            if not self.context:
                raise Exception("浏览器上下文创建失败")
            logger.info(f"【{self.pure_user_id}】浏览器上下文创建成功")
            
            # 创建新页面
            logger.info(f"【{self.pure_user_id}】创建新页面...")
            self.page = self.context.new_page()
            
            # 验证页面已创建
            if not self.page:
                raise Exception("页面创建失败")
            logger.info(f"【{self.pure_user_id}】页面创建成功（{'最大化窗口模式' if not self.headless else '无头模式'}）")
            
            # 添加增强反检测脚本
            logger.info(f"【{self.pure_user_id}】添加反检测脚本...")
            self.page.add_init_script(self._get_stealth_script(browser_features))
            logger.info(f"【{self.pure_user_id}】浏览器初始化完成")
            
            return self.page
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】初始化浏览器失败: {e}")
            import traceback
            logger.error(f"【{self.pure_user_id}】详细错误堆栈: {traceback.format_exc()}")
            # 确保在异常时也清理已创建的资源
            self._cleanup_on_init_failure()
            raise
    
    def _cleanup_on_init_failure(self):
        """初始化失败时的清理"""
        try:
            if hasattr(self, 'page') and self.page:
                self.page.close()
                self.page = None
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】清理页面时出错: {e}")
        
        try:
            if hasattr(self, 'context') and self.context:
                self.context.close()
                self.context = None
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】清理上下文时出错: {e}")
        
        try:
            if hasattr(self, 'browser') and self.browser:
                self.browser.close()
                self.browser = None
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】清理浏览器时出错: {e}")
        
        try:
            if hasattr(self, 'playwright') and self.playwright:
                self.playwright.stop()
                self.playwright = None
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】清理Playwright时出错: {e}")
    
    def _load_success_history(self) -> List[Dict[str, Any]]:
        """加载历史成功数据"""
        try:
            if not os.path.exists(self.success_history_file):
                return []
            
            with open(self.success_history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
                logger.info(f"【{self.pure_user_id}】加载历史成功数据: {len(history)}条记录")
                return history
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】加载历史数据失败: {e}")
            return []
    
    def _save_success_record(self, trajectory_data: Dict[str, Any]):
        """保存成功记录"""
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(self.success_history_file), exist_ok=True)
            
            # 加载现有历史
            history = self._load_success_history()
            
            # 添加新记录 - 只保存必要参数，不保存完整轨迹点（节省内存和磁盘空间）
            record = {
                "timestamp": time.time(),
                "user_id": self.pure_user_id,
                "distance": trajectory_data.get("distance", 0),
                "total_steps": trajectory_data.get("total_steps", 0),
                "base_delay": trajectory_data.get("base_delay", 0),
                "jitter_x_range": trajectory_data.get("jitter_x_range", [0, 0]),
                "jitter_y_range": trajectory_data.get("jitter_y_range", [0, 0]),
                "slow_factor": trajectory_data.get("slow_factor", 0),
                "acceleration_phase": trajectory_data.get("acceleration_phase", 0),
                "fast_phase": trajectory_data.get("fast_phase", 0),
                "slow_start_ratio": trajectory_data.get("slow_start_ratio", 0),
                # 【优化】不再保存完整轨迹点，节省 90% 存储空间
                # "trajectory_points": trajectory_data.get("trajectory_points", []),
                "trajectory_point_count": len(trajectory_data.get("trajectory_points", [])),  # 只记录数量
                "final_left_px": trajectory_data.get("final_left_px", 0),
                "completion_used": trajectory_data.get("completion_used", False),
                "completion_steps": trajectory_data.get("completion_steps", 0),
                "success": True
            }
            
            history.append(record)
            
            # 只保留最近100条成功记录
            if len(history) > 100:
                history = history[-100:]
            
            # 保存到文件
            with open(self.success_history_file, 'w', encoding='utf-8') as f:
                json.dump(history, f, ensure_ascii=False, indent=2)
            
            logger.info(f"【{self.pure_user_id}】保存成功记录: 距离{record['distance']}px, 步数{record['total_steps']}, 轨迹点{record['trajectory_point_count']}个")
            
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】保存成功记录失败: {e}")
    
    def _optimize_trajectory_params(self) -> Dict[str, Any]:
        """基于历史成功数据优化轨迹参数"""
        try:
            if not self.enable_learning:
                return self.trajectory_params
            
            history = self._load_success_history()
            if len(history) < 3:  # 至少需要3条成功记录才开始优化
                logger.info(f"【{self.pure_user_id}】历史成功数据不足({len(history)}条)，使用默认参数")
                return self.trajectory_params
            
            # 计算成功记录的平均值
            total_steps_list = [record["total_steps"] for record in history]
            base_delay_list = [record["base_delay"] for record in history]
            slow_factor_list = [record["slow_factor"] for record in history]
            acceleration_phase_list = [record["acceleration_phase"] for record in history]
            fast_phase_list = [record["fast_phase"] for record in history]
            slow_start_ratio_list = [record["slow_start_ratio"] for record in history]
            
            # 基于完整轨迹数据的学习
            completion_usage_rate = 0
            avg_completion_steps = 0
            trajectory_length_stats = []
            
            if len(history) > 0:
                # 计算补全使用率
                completion_used_count = sum(1 for record in history if record.get("completion_used", False))
                completion_usage_rate = completion_used_count / len(history)
                
                # 计算平均补全步数
                completion_steps_list = [record.get("completion_steps", 0) for record in history if record.get("completion_used", False)]
                if completion_steps_list:
                    avg_completion_steps = sum(completion_steps_list) / len(completion_steps_list)
                
                # 分析轨迹长度分布
                trajectory_lengths = [len(record.get("trajectory_points", [])) for record in history]
                if trajectory_lengths:
                    trajectory_length_stats = [min(trajectory_lengths), max(trajectory_lengths), sum(trajectory_lengths) / len(trajectory_lengths)]
            
            # 计算平均值和标准差
            def safe_avg(values):
                return sum(values) / len(values) if values else 0
            
            def safe_std(values):
                if len(values) < 2:
                    return 0
                avg = safe_avg(values)
                variance = sum((x - avg) ** 2 for x in values) / len(values)
                return variance ** 0.5
            
            # 优化参数 - 真实人类模式（优先真实度而非速度）
            # 计算步数范围（确保最小值 < 最大值）
            steps_min = max(110, int(safe_avg(total_steps_list) - safe_std(total_steps_list) * 0.8))
            steps_max = min(130, int(safe_avg(total_steps_list) + safe_std(total_steps_list) * 0.8))
            if steps_min >= steps_max:
                steps_min = 115
                steps_max = 125
            
            # 计算延迟范围（确保最小值 < 最大值）
            delay_min = max(0.020, safe_avg(base_delay_list) - safe_std(base_delay_list) * 0.6)
            delay_max = min(0.030, safe_avg(base_delay_list) + safe_std(base_delay_list) * 0.6)
            if delay_min >= delay_max:
                delay_min = 0.022
                delay_max = 0.027
            
            # 计算慢速因子范围（确保最小值 < 最大值）
            slow_min = max(5, int(safe_avg(slow_factor_list) - safe_std(slow_factor_list)))
            slow_max = min(20, int(safe_avg(slow_factor_list) + safe_std(slow_factor_list)))
            if slow_min >= slow_max:
                slow_min = 8
                slow_max = 15
            
            optimized_params = {
                "total_steps_range": [steps_min, steps_max],
                "base_delay_range": [delay_min, delay_max],
                "jitter_x_range": [-3, 12],  # 保持固定范围
                "jitter_y_range": [-2, 12],  # 保持固定范围
                "slow_factor_range": [slow_min, slow_max],
                "acceleration_phase": max(0.08, min(0.12, safe_avg(acceleration_phase_list))),
                "fast_phase": max(0.7, min(0.8, safe_avg(fast_phase_list))),
                "slow_start_ratio_base": max(0.98, min(1.02, safe_avg(slow_start_ratio_list))),
                "completion_usage_rate": completion_usage_rate,
                "avg_completion_steps": avg_completion_steps,
                "trajectory_length_stats": trajectory_length_stats,
                "learning_enabled": True
            }
            
            logger.info(f"【{self.pure_user_id}】基于{len(history)}条成功记录优化轨迹参数: 步数{optimized_params['total_steps_range']}, 延迟{optimized_params['base_delay_range']}")

            return optimized_params
            
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】优化轨迹参数失败: {e}")
            return self.trajectory_params
    
    def _get_cookies_after_success(self):
        """滑块验证成功后获取cookie"""
        try:
            logger.info(f"【{self.pure_user_id}】开始获取滑块验证成功后的页面cookie...")
            
            # 检查当前页面URL
            current_url = self.page.url
            logger.info(f"【{self.pure_user_id}】当前页面URL: {current_url}")
            
            # 检查页面标题
            page_title = self.page.title()
            logger.info(f"【{self.pure_user_id}】当前页面标题: {page_title}")
            
            # 等待一下确保cookie完全更新
            time.sleep(1)
            
            # 获取浏览器中的所有cookie
            cookies = self.context.cookies()
            
            if cookies:
                # 将cookie转换为字典格式
                new_cookies = {}
                for cookie in cookies:
                    new_cookies[cookie['name']] = cookie['value']
                
                logger.info(f"【{self.pure_user_id}】滑块验证成功后已获取cookie，共{len(new_cookies)}个cookie")
                
                # 记录所有cookie的详细信息
                logger.info(f"【{self.pure_user_id}】获取到的所有cookie: {list(new_cookies.keys())}")
                
                # 只提取x5sec相关的cookie
                filtered_cookies = {}
                
                # 筛选出x5相关的cookies（包括x5sec, x5step等）
                for cookie_name, cookie_value in new_cookies.items():
                    cookie_name_lower = cookie_name.lower()
                    if cookie_name_lower.startswith('x5') or 'x5sec' in cookie_name_lower:
                        filtered_cookies[cookie_name] = cookie_value
                        logger.info(f"【{self.pure_user_id}】x5相关cookie已获取: {cookie_name} = {cookie_value}")
                
                logger.info(f"【{self.pure_user_id}】找到{len(filtered_cookies)}个x5相关cookies: {list(filtered_cookies.keys())}")
                
                if filtered_cookies:
                    logger.info(f"【{self.pure_user_id}】返回过滤后的x5相关cookie: {list(filtered_cookies.keys())}")
                    return filtered_cookies
                else:
                    logger.warning(f"【{self.pure_user_id}】未找到x5相关cookie")
                    return None
            else:
                logger.warning(f"【{self.pure_user_id}】未获取到任何cookie")
                return None
                
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】获取滑块验证成功后的cookie失败: {str(e)}")
            return None
    
    def _save_cookies_to_file(self, cookies):
        """保存cookie到文件"""
        try:
            # 确保目录存在
            cookie_dir = f"slider_cookies/{self.user_id}"
            os.makedirs(cookie_dir, exist_ok=True)
            
            # 保存cookie到JSON文件
            cookie_file = f"{cookie_dir}/cookies_{int(time.time())}.json"
            with open(cookie_file, 'w', encoding='utf-8') as f:
                json.dump(cookies, f, ensure_ascii=False, indent=2)
            
            logger.info(f"【{self.pure_user_id}】Cookie已保存到文件: {cookie_file}")
            
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】保存cookie到文件失败: {str(e)}")
    
    def _get_random_browser_features(self):
        """获取随机浏览器特征"""
        # 随机选择窗口大小（使用更大的尺寸以适应最大化）
        window_sizes = [
            "1920,1080", "1920,1200", "2560,1440", "1680,1050", "1600,900"
        ]
        
        # 随机选择语言
        languages = [
            ("zh-CN", "zh-CN,zh;q=0.9,en;q=0.8"),
            ("zh-CN", "zh-CN,zh;q=0.9"),
            ("zh-CN", "zh-CN,zh;q=0.8,en;q=0.6")
        ]
        
        # 随机选择用户代理
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        ]
        
        window_size = random.choice(window_sizes)
        lang, accept_lang = random.choice(languages)
        user_agent = random.choice(user_agents)
        
        # 解析窗口大小
        width, height = map(int, window_size.split(','))
        
        return {
            'window_size': window_size,
            'lang': lang,
            'accept_lang': accept_lang,
            'user_agent': user_agent,
            'locale': lang,
            'viewport_width': width,
            'viewport_height': height,
            'device_scale_factor': random.choice([1.0, 1.25, 1.5]),
            'is_mobile': False,
            'has_touch': False,
            'timezone_id': 'Asia/Shanghai'
        }
    
    def _get_stealth_script(self, browser_features):
        """获取增强反检测脚本"""
        return f"""
            // 隐藏webdriver属性
            Object.defineProperty(navigator, 'webdriver', {{
                get: () => undefined,
            }});
            
            // 隐藏自动化相关属性
            delete navigator.__proto__.webdriver;
            delete window.navigator.webdriver;
            delete window.navigator.__proto__.webdriver;
            
            // 模拟真实浏览器环境
            window.chrome = {{
                runtime: {{}},
                loadTimes: function() {{}},
                csi: function() {{}},
                app: {{}}
            }};
            
            // 覆盖plugins - 随机化
            const pluginCount = {random.randint(3, 8)};
            Object.defineProperty(navigator, 'plugins', {{
                get: () => Array.from({{length: pluginCount}}, (_, i) => ({{name: `Plugin${{i}}`, description: `Plugin ${{i}}`}})),
            }});
            
            // 覆盖languages
            Object.defineProperty(navigator, 'languages', {{
                get: () => ['{browser_features['locale']}', 'zh', 'en'],
            }});
            
            // 模拟真实的屏幕信息
            Object.defineProperty(screen, 'availWidth', {{ get: () => {browser_features['viewport_width']} }});
            Object.defineProperty(screen, 'availHeight', {{ get: () => {browser_features['viewport_height'] - 40} }});
            Object.defineProperty(screen, 'width', {{ get: () => {browser_features['viewport_width']} }});
            Object.defineProperty(screen, 'height', {{ get: () => {browser_features['viewport_height']} }});
            
            // 隐藏自动化检测 - 随机化硬件信息
            Object.defineProperty(navigator, 'hardwareConcurrency', {{ get: () => {random.choice([2, 4, 6, 8])} }});
            Object.defineProperty(navigator, 'deviceMemory', {{ get: () => {random.choice([4, 8, 16])} }});
            
            // 模拟真实的时区
            Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {{
                value: function() {{
                    return {{ timeZone: '{browser_features['timezone_id']}' }};
                }}
            }});
            
            // 隐藏自动化痕迹
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
            
            // 模拟有头模式的特征
            Object.defineProperty(navigator, 'maxTouchPoints', {{ get: () => 0 }});
            Object.defineProperty(navigator, 'platform', {{ get: () => 'Win32' }});
            Object.defineProperty(navigator, 'vendor', {{ get: () => 'Google Inc.' }});
            Object.defineProperty(navigator, 'vendorSub', {{ get: () => '' }});
            Object.defineProperty(navigator, 'productSub', {{ get: () => '20030107' }});
            
            // 模拟真实的连接信息
            Object.defineProperty(navigator, 'connection', {{
                get: () => ({{
                    effectiveType: '{random.choice(['3g', '4g', '5g'])}',
                    rtt: {random.randint(20, 100)},
                    downlink: {random.uniform(1, 10)}
                }})
            }});
            
            // 隐藏无头模式特征
            Object.defineProperty(navigator, 'headless', {{ get: () => undefined }});
            Object.defineProperty(window, 'outerHeight', {{ get: () => {browser_features['viewport_height']} }});
            Object.defineProperty(window, 'outerWidth', {{ get: () => {browser_features['viewport_width']} }});
            
            // 模拟真实的媒体设备
            Object.defineProperty(navigator, 'mediaDevices', {{
                get: () => ({{
                    enumerateDevices: () => Promise.resolve([])
                }}),
            }});
            
            // 隐藏自动化检测特征
            Object.defineProperty(navigator, 'webdriver', {{ get: () => undefined }});
            Object.defineProperty(navigator, '__webdriver_script_fn', {{ get: () => undefined }});
            Object.defineProperty(navigator, '__webdriver_evaluate', {{ get: () => undefined }});
            Object.defineProperty(navigator, '__webdriver_unwrapped', {{ get: () => undefined }});
            Object.defineProperty(navigator, '__fxdriver_evaluate', {{ get: () => undefined }});
            Object.defineProperty(navigator, '__driver_evaluate', {{ get: () => undefined }});
            Object.defineProperty(navigator, '__webdriver_script_func', {{ get: () => undefined }});
            
            // 隐藏Playwright特定的对象
            delete window.playwright;
            delete window.__playwright;
            delete window.__pw_manual;
            delete window.__pw_original;
            
            // 模拟真实的用户代理
            Object.defineProperty(navigator, 'userAgent', {{
                get: () => '{browser_features['user_agent']}'
            }});
            
            // 隐藏自动化相关的全局变量
            delete window.webdriver;
            delete window.__webdriver_script_fn;
            delete window.__webdriver_evaluate;
            delete window.__webdriver_unwrapped;
            delete window.__fxdriver_evaluate;
            delete window.__driver_evaluate;
            delete window.__webdriver_script_func;
            delete window._selenium;
            delete window._phantom;
            delete window.callPhantom;
            delete window._phantom;
            delete window.phantom;
            delete window.Buffer;
            delete window.emit;
            delete window.spawn;
            
            // Canvas指纹随机化
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function() {{
                const context = this.getContext('2d');
                if (context) {{
                    const imageData = context.getImageData(0, 0, this.width, this.height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {{
                        if (Math.random() < 0.001) {{
                            data[i] = Math.floor(Math.random() * 256);
                        }}
                    }}
                    context.putImageData(imageData, 0, 0);
                }}
                return originalToDataURL.apply(this, arguments);
            }};
            
            // 音频指纹随机化
            const originalGetChannelData = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = function(channel) {{
                const data = originalGetChannelData.call(this, channel);
                for (let i = 0; i < data.length; i += 1000) {{
                    if (Math.random() < 0.01) {{
                        data[i] += Math.random() * 0.0001;
                    }}
                }}
                return data;
            }};
            
            // WebGL指纹随机化
            const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {{
                if (parameter === 37445) {{ // UNMASKED_VENDOR_WEBGL
                    return 'Intel Inc.';
                }}
                if (parameter === 37446) {{ // UNMASKED_RENDERER_WEBGL
                    return 'Intel Iris OpenGL Engine';
                }}
                return originalGetParameter.call(this, parameter);
            }};
            
            // 模拟真实的鼠标事件
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {{
                if (type === 'mousedown' || type === 'mouseup' || type === 'mousemove') {{
                    const originalListener = listener;
                    listener = function(event) {{
                        setTimeout(() => originalListener.call(this, event), Math.random() * 10);
                    }};
                }}
                return originalAddEventListener.call(this, type, listener, options);
            }};
            
            // 随机化字体检测
            Object.defineProperty(document, 'fonts', {{
                get: () => ({{
                    ready: Promise.resolve(),
                    check: () => true,
                    load: () => Promise.resolve([])
                }})
            }});
            
            // 隐藏自动化检测的常见特征
            Object.defineProperty(window, 'chrome', {{
                get: () => ({{
                    runtime: {{}},
                    loadTimes: function() {{}},
                    csi: function() {{}},
                    app: {{}}
                }})
            }});
            
            // 增强鼠标移动轨迹记录
            let mouseMovements = [];
            let lastMouseTime = Date.now();
            document.addEventListener('mousemove', function(e) {{
                const now = Date.now();
                const timeDiff = now - lastMouseTime;
                mouseMovements.push({{
                    x: e.clientX,
                    y: e.clientY,
                    time: now,
                    timeDiff: timeDiff
                }});
                lastMouseTime = now;
                // 保持最近100个移动记录
                if (mouseMovements.length > 100) {{
                    mouseMovements.shift();
                }}
            }}, true);
            
            // 模拟真实的屏幕触摸点数
            Object.defineProperty(navigator, 'maxTouchPoints', {{
                get: () => {random.choice([0, 1, 5, 10])}
            }});
            
            // 模拟真实的电池API
            if (navigator.getBattery) {{
                const originalGetBattery = navigator.getBattery;
                navigator.getBattery = async function() {{
                    const battery = await originalGetBattery.call(navigator);
                    Object.defineProperty(battery, 'charging', {{ get: () => {random.choice(['true', 'false'])} }});
                    Object.defineProperty(battery, 'level', {{ get: () => {random.uniform(0.3, 0.95):.2f} }});
                    return battery;
                }};
            }}
            
            // 伪装鼠标移动加速度（反检测关键）
            let velocityProfile = [];
            window.addEventListener('mousemove', function(e) {{
                const now = performance.now();
                velocityProfile.push({{ x: e.clientX, y: e.clientY, t: now }});
                if (velocityProfile.length > 50) velocityProfile.shift();
            }}, true);
            
            // 伪装Permission API
            const originalQuery = Permissions.prototype.query;
            Permissions.prototype.query = function(parameters) {{
                if (parameters.name === 'notifications') {{
                    return Promise.resolve({{ state: 'denied' }});
                }}
                return originalQuery.apply(this, arguments);
            }};
            
            // 伪装Performance API
            const originalNow = Performance.prototype.now;
            Performance.prototype.now = function() {{
                return originalNow.call(this) + Math.random() * 0.1;
            }};
            
            // 伪装Date API（添加微小随机偏移）
            const OriginalDate = Date;
            Date = function(...args) {{
                if (args.length === 0) {{
                    const date = new OriginalDate();
                    const offset = Math.floor(Math.random() * 3) - 1; // -1到1毫秒
                    return new OriginalDate(date.getTime() + offset);
                }}
                return new OriginalDate(...args);
            }};
            Date.prototype = OriginalDate.prototype;
            Date.now = function() {{
                return OriginalDate.now() + Math.floor(Math.random() * 3) - 1;
            }};
            
            // 伪装RTCPeerConnection（WebRTC指纹）
            if (window.RTCPeerConnection) {{
                const originalRTC = window.RTCPeerConnection;
                window.RTCPeerConnection = function(...args) {{
                    const pc = new originalRTC(...args);
                    const originalCreateOffer = pc.createOffer;
                    pc.createOffer = function(...args) {{
                        return originalCreateOffer.apply(this, args).then(offer => {{
                            // 修改SDP指纹
                            offer.sdp = offer.sdp.replace(/a=fingerprint:.*\\r\\n/g, 
                                `a=fingerprint:sha-256 ${{Array.from({{length:64}}, ()=>Math.floor(Math.random()*16).toString(16)).join('')}}\\r\\n`);
                            return offer;
                        }});
                    }};
                    return pc;
                }};
            }}
            
            // 伪装 Notification 权限（防止被检测为自动化）
            Object.defineProperty(Notification, 'permission', {{
                get: function() {{
                    return ['default', 'granted', 'denied'][Math.floor(Math.random() * 3)];
                }}
            }});
            
            // 伪装 Connection API（添加网络信息变化）
            if (navigator.connection) {{
                const connection = navigator.connection;
                const originalEffectiveType = connection.effectiveType;
                Object.defineProperty(connection, 'effectiveType', {{
                    get: function() {{
                        const types = ['slow-2g', '2g', '3g', '4g'];
                        return types[Math.floor(Math.random() * types.length)];
                    }}
                }});
                Object.defineProperty(connection, 'rtt', {{
                    get: function() {{
                        return Math.floor(Math.random() * 100) + 50; // 50-150ms
                    }}
                }});
                Object.defineProperty(connection, 'downlink', {{
                    get: function() {{
                        return Math.random() * 10 + 1; // 1-11 Mbps
                    }}
                }});
            }}
            
            // 伪装 DeviceMemory（设备内存）
            Object.defineProperty(navigator, 'deviceMemory', {{
                get: function() {{
                    const memories = [2, 4, 8, 16];
                    return memories[Math.floor(Math.random() * memories.length)];
                }}
            }});
            
            // 伪装 HardwareConcurrency（CPU核心数）
            Object.defineProperty(navigator, 'hardwareConcurrency', {{
                get: function() {{
                    const cores = [2, 4, 6, 8, 12, 16];
                    return cores[Math.floor(Math.random() * cores.length)];
                }}
            }});
            
            // 伪装 maxTouchPoints（触摸点数量）
            Object.defineProperty(navigator, 'maxTouchPoints', {{
                get: function() {{
                    return Math.floor(Math.random() * 5) + 1; // 1-5个触摸点
                }}
            }});
            
            // 伪装 DoNotTrack
            Object.defineProperty(navigator, 'doNotTrack', {{
                get: function() {{
                    return ['1', '0', 'unspecified', null][Math.floor(Math.random() * 4)];
                }}
            }});
            
            // 伪装 Geolocation（添加微小延迟和误差）
            if (navigator.geolocation) {{
                const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
                navigator.geolocation.getCurrentPosition = function(success, error, options) {{
                    const wrappedSuccess = function(position) {{
                        // 添加微小的位置偏移（模拟真实GPS误差）
                        const offset = Math.random() * 0.001;
                        position.coords.latitude += offset;
                        position.coords.longitude += offset;
                        success(position);
                    }};
                    // 添加随机延迟
                    setTimeout(() => {{
                        originalGetCurrentPosition.call(this, wrappedSuccess, error, options);
                    }}, Math.random() * 100);
                }};
            }}
            
            // 伪装 Clipboard API（防止检测剪贴板访问模式）
            if (navigator.clipboard) {{
                const originalReadText = navigator.clipboard.readText;
                navigator.clipboard.readText = async function() {{
                    // 添加微小延迟
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
                    return originalReadText.call(this);
                }};
            }}
            
            // 🔑 关键优化：隐藏CDP运行时特征
            Object.defineProperty(navigator, 'webdriver', {{
                get: () => undefined
            }});
            
            // 🔑 隐藏自动化控制特征
            window.navigator.chrome = {{
                runtime: {{}},
                loadTimes: function() {{}},
                csi: function() {{}},
                app: {{}}
            }};
            
            // 🔑 隐藏Playwright特征
            delete window.__playwright;
            delete window.__pw_manual;
            delete window.__PW_inspect;
            
            // 🔑 伪装chrome对象（防止检测headless）
            if (!window.chrome) {{
                window.chrome = {{}};
            }}
            window.chrome.runtime = {{
                id: undefined,
                sendMessage: function() {{}},
                connect: function() {{}}
            }};
            
            // 🔑 伪装Permissions API
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({{ state: Notification.permission }}) :
                    originalQuery(parameters)
            );
            
            // 🔑 覆盖Function.prototype.toString以隐藏代理
            const oldToString = Function.prototype.toString;
            Function.prototype.toString = function() {{
                if (this === navigator.permissions.query) {{
                    return 'function query() {{ [native code] }}';
                }}
                return oldToString.call(this);
            }};
        """
    
    def _bezier_curve(self, p0, p1, p2, p3, t):
        """三次贝塞尔曲线 - 生成更自然的轨迹"""
        return (1-t)**3 * p0 + 3*(1-t)**2*t * p1 + 3*(1-t)*t**2 * p2 + t**3 * p3
    
    def _easing_function(self, t, mode='easeOutQuad'):
        """缓动函数 - 模拟真实人类滑动的速度变化"""
        if mode == 'easeOutQuad':
            return t * (2 - t)
        elif mode == 'easeInOutCubic':
            return 4*t**3 if t < 0.5 else 1 - pow(-2*t + 2, 3) / 2
        elif mode == 'easeOutBack':
            c1 = 1.70158
            c3 = c1 + 1
            return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2)
        else:
            return t
    
    def _generate_physics_trajectory(self, distance: float):
        """基于物理加速度模型生成轨迹 - 极速模式
        
        优化策略：
        1. 极少轨迹点（5-8步）：快速完成
        2. 持续加速：一气呵成，不减速
        3. 确保超调50%以上：保证滑动到位
        4. 无回退：单向滑动
        """
        trajectory = []
        # 确保超调100%
        target_distance = distance * random.uniform(2.0, 2.1)  # 超调100-110%
        
        # 极少步数（5-8步）
        steps = random.randint(5, 8)
        
        # 极快时间间隔
        base_delay = random.uniform(0.0002, 0.0005)
        
        # 生成轨迹点 - 直线加速
        for i in range(steps):
            progress = (i + 1) / steps
            
            # 计算当前位置（使用平方加速曲线，越来越快）
            x = target_distance * (progress ** 1.5)  # 加速曲线
            
            # 极小Y轴抖动
            y = random.uniform(0, 2)
            
            # 极短延迟
            delay = base_delay * random.uniform(0.9, 1.1)
            
            trajectory.append((x, y, delay))
        
        logger.info(f"【{self.pure_user_id}】极速模式：{len(trajectory)}步，超调100%+")
        return trajectory
    
    def generate_human_trajectory(self, distance: float):
        """生成人类化滑动轨迹 - 只使用极速物理模型"""
        try:
            # 只使用物理加速度模型（移除贝塞尔模型以提高速度和稳定性）
            logger.info(f"【{self.pure_user_id}】📐 使用极速物理模型生成轨迹")
            trajectory = self._generate_physics_trajectory(distance)
            
            logger.debug(f"【{self.pure_user_id}】极速模式：一次拖到位，无回退")
            
            # 保存轨迹数据
            self.current_trajectory_data = {
                "distance": distance,
                "model": "physics_fast",
                "total_steps": len(trajectory),
                "trajectory_points": trajectory.copy(),
                "final_left_px": 0,
                "completion_used": False,
                "completion_steps": 0
            }
            
            return trajectory
            
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】生成轨迹时出错: {str(e)}")
            return []
    
    def simulate_slide(self, slider_button: ElementHandle, trajectory):
        """模拟滑动 - 增强人类行为模拟"""
        try:
            logger.info(f"【{self.pure_user_id}】开始模拟滑动...")
            
            # 获取滑块按钮中心位置
            button_box = slider_button.bounding_box()
            if not button_box:
                logger.error(f"【{self.pure_user_id}】无法获取滑块按钮位置")
                return False
            
            start_x = button_box["x"] + button_box["width"] / 2
            start_y = button_box["y"] + button_box["height"] / 2
            
            # 极速模式：直接移动到滑块位置，无复杂前置动作
            self.page.mouse.move(start_x, start_y)
            time.sleep(0.001)  # 极短停顿
            
            # 按下鼠标，准备拖动
            self.page.mouse.down()
            time.sleep(0.001)  # 极短准备
            
            # 执行滑动轨迹
            final_left_px = 0  # 记录最终的left值
            
            # 移除所有微调和犹豫，保持丝滑流畅的滑动
            # 真实手动滑动是一气呵成的，不会中途回退或停顿
            
            for i, (x, y, delay) in enumerate(trajectory):
                # 计算当前位置
                current_x = start_x + x
                current_y = start_y + y
                
                # 直接移动，无任何卡顿
                self.page.mouse.move(current_x, current_y)
                
                # 延迟（添加微小随机变化，避免太规律）
                actual_delay = delay * random.uniform(0.9, 1.1)
                time.sleep(actual_delay)
                
                # 极速模式：只在最后记录，减少日志输出
                if i == len(trajectory) - 1:
                    try:
                        current_style = slider_button.get_attribute("style")
                        if current_style and "left:" in current_style:
                            import re
                            left_match = re.search(r'left:\s*([^;]+)', current_style)
                            if left_match:
                                left_value = left_match.group(1).strip()
                                left_px = float(left_value.replace('px', ''))
                                final_left_px = left_px
                                if hasattr(self, 'current_trajectory_data'):
                                    self.current_trajectory_data["final_left_px"] = final_left_px
                                logger.info(f"【{self.pure_user_id}】滑动完成: {len(trajectory)}步 - 最终位置: {left_value}")
                    except:
                        pass
            
            # 极速模式：立即释放鼠标，无补全逻辑（已超调50%）
            time.sleep(0.001)  # 极短停顿
            self.page.mouse.up()
            logger.info(f"【{self.pure_user_id}】滑动完成（极速模式，无回退）")
            
            return True
            
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】模拟滑动时出错: {str(e)}")
            return False
    
    def _simulate_human_page_behavior(self):
        """模拟人类在验证页面的前置行为 - 极速模式已禁用"""
        # 极速模式：不进行页面行为模拟，直接开始滑动
        pass
    
    def find_slider_elements(self):
        """查找滑块元素"""
        try:
            # 快速等待页面稳定
            time.sleep(0.1)
            
            # 定义滑块容器选择器
            container_selectors = [
                ".nc-container",
                "#baxia-dialog-content",
                ".nc_wrapper",
                ".nc_scale",
                "[class*='nc-container']",
                "[class*='slider']",
                "[class*='captcha']"
            ]
            
            # 查找滑块容器
            slider_container = None
            for selector in container_selectors:
                try:
                    element = self.page.wait_for_selector(selector, timeout=3000)
                    if element:
                        logger.info(f"【{self.pure_user_id}】找到滑块容器: {selector}")
                        slider_container = element
                        break
                except Exception as e:
                    logger.debug(f"【{self.pure_user_id}】选择器 {selector} 未找到: {e}")
                    continue
            
            if not slider_container:
                logger.error(f"【{self.pure_user_id}】未找到任何滑块容器")
                return None, None, None
            
            # 定义滑块按钮选择器
            button_selectors = [
                "#nc_1_n1z",
                ".nc_iconfont",
                ".btn_slide",
                "[class*='slider']",
                "[class*='btn']",
                "[role='button']"
            ]
            
            # 查找滑块按钮
            slider_button = None
            for selector in button_selectors:
                try:
                    element = self.page.wait_for_selector(selector, timeout=3000)
                    if element:
                        logger.info(f"【{self.pure_user_id}】找到滑块按钮: {selector}")
                        slider_button = element
                        break
                except Exception as e:
                    logger.debug(f"【{self.pure_user_id}】选择器 {selector} 未找到: {e}")
                    continue
            
            if not slider_button:
                logger.error(f"【{self.pure_user_id}】未找到任何滑块按钮")
                return slider_container, None, None
            
            # 定义滑块轨道选择器
            track_selectors = [
                "#nc_1_n1t",
                ".nc_scale",
                ".nc_1_n1t",
                "[class*='track']",
                "[class*='scale']"
            ]
            
            # 查找滑块轨道
            slider_track = None
            for selector in track_selectors:
                try:
                    element = self.page.wait_for_selector(selector, timeout=3000)
                    if element:
                        logger.info(f"【{self.pure_user_id}】找到滑块轨道: {selector}")
                        slider_track = element
                        break
                except Exception as e:
                    logger.debug(f"【{self.pure_user_id}】选择器 {selector} 未找到: {e}")
                    continue
            
            if not slider_track:
                logger.error(f"【{self.pure_user_id}】未找到任何滑块轨道")
                return slider_container, slider_button, None
            
            return slider_container, slider_button, slider_track
            
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】查找滑块元素时出错: {str(e)}")
            return None, None, None
    
    def calculate_slide_distance(self, slider_button: ElementHandle, slider_track: ElementHandle):
        """计算滑动距离 - 增强精度"""
        try:
            # 获取滑块按钮位置和大小
            button_box = slider_button.bounding_box()
            if not button_box:
                logger.error(f"【{self.pure_user_id}】无法获取滑块按钮位置")
                return 0
            
            # 获取滑块轨道位置和大小
            track_box = slider_track.bounding_box()
            if not track_box:
                logger.error(f"【{self.pure_user_id}】无法获取滑块轨道位置")
                return 0
            
            # 🔑 关键优化1：使用JavaScript获取更精确的尺寸（避免DPI缩放影响）
            try:
                precise_distance = self.page.evaluate("""
                    () => {
                        const button = document.querySelector('#nc_1_n1z') || document.querySelector('.nc_iconfont');
                        const track = document.querySelector('#nc_1_n1t') || document.querySelector('.nc_scale');
                        if (button && track) {
                            const buttonRect = button.getBoundingClientRect();
                            const trackRect = track.getBoundingClientRect();
                            // 计算实际可滑动距离（考虑padding和边距）
                            return trackRect.width - buttonRect.width;
                        }
                        return null;
                    }
                """)
                
                if precise_distance and precise_distance > 0:
                    logger.info(f"【{self.pure_user_id}】使用JavaScript精确计算滑动距离: {precise_distance:.2f}px")
                    # 🔑 关键优化2：添加微小随机偏移（防止每次都完全相同）
                    # 真人操作时，滑动距离会有微小偏差
                    random_offset = random.uniform(-0.5, 0.5)
                    return precise_distance + random_offset
            except Exception as e:
                logger.debug(f"【{self.pure_user_id}】JavaScript精确计算失败，使用后备方案: {e}")
            
            # 后备方案：使用bounding_box计算
            slide_distance = track_box["width"] - button_box["width"]
            # 添加微小随机偏移
            random_offset = random.uniform(-0.5, 0.5)
            slide_distance += random_offset
            
            logger.info(f"【{self.pure_user_id}】计算滑动距离: {slide_distance:.2f}px (轨道宽度: {track_box['width']}px, 滑块宽度: {button_box['width']}px, 随机偏移: {random_offset:.2f}px)")
            
            return slide_distance
            
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】计算滑动距离时出错: {str(e)}")
            return 0
    
    def check_verification_success_fast(self, slider_button: ElementHandle):
        """检查验证结果 - 极速模式"""
        try:
            logger.info(f"【{self.pure_user_id}】检查验证结果（极速模式）...")
            
            # 极速检查：只等待1.5秒总计
            time.sleep(0.3)
            
            # 检查是否立即成功（滑块容器消失）
            try:
                container = self.page.query_selector(".nc-container")
                if not container or not container.is_visible():
                    logger.info(f"【{self.pure_user_id}】✓ 滑块容器已消失（快速检测），验证成功")
                    return True
            except:
                pass
            
            # 快速检查URL变化
            if self.check_page_changed():
                logger.info(f"【{self.pure_user_id}】✓ 页面已改变，验证成功")
                return True
            
            # 再等待1.2秒进行最终检查
            time.sleep(1.2)
            
            # 检查滑块按钮的left属性是否改变
            try:
                current_style = slider_button.get_attribute("style")
                if current_style and "left:" in current_style:
                    import re
                    left_match = re.search(r'left:\s*([^;]+)', current_style)
                    if left_match:
                        left_value = left_match.group(1).strip()
                        logger.info(f"【{self.pure_user_id}】滑块最终位置: {left_value}")
                        
                        # 如果left值大于0，说明滑块被移动了
                        try:
                            left_px = float(left_value.replace('px', ''))
                            if left_px > 0:
                                logger.info(f"【{self.pure_user_id}】滑块已移动，检查页面是否改变...")
                                
                                # 检查页面是否改变
                                if self.check_page_changed():
                                    logger.info(f"【{self.pure_user_id}】页面已改变，验证成功")
                                    return True
                                else:
                                    logger.warning(f"【{self.pure_user_id}】页面未改变，检查验证失败提示...")
                                    return self.check_verification_failure()
                        except:
                            pass
            except:
                pass
            
            # 检查滑块容器是否消失
            try:
                container = self.page.query_selector(".nc-container")
                if not container or not container.is_visible():
                    logger.info(f"【{self.pure_user_id}】滑块容器已消失，验证成功")
                    return True
                else:
                    logger.warning(f"【{self.pure_user_id}】滑块容器仍存在，验证失败")
                    return False
            except:
                pass
            
            # 检查滑块轨道是否消失
            try:
                track = self.page.query_selector("#nc_1_n1t")
                if not track or not track.is_visible():
                    logger.info(f"【{self.pure_user_id}】滑块轨道已消失，验证成功")
                    return True
                else:
                    logger.warning(f"【{self.pure_user_id}】滑块轨道仍存在，验证失败")
                    return False
            except:
                pass
            
            # 检查成功消息
            success_selectors = [
                "text=验证成功",
                "text=验证通过",
                "text=成功",
                ".success",
                "[class*='success']"
            ]
            
            for selector in success_selectors:
                try:
                    element = self.page.query_selector(selector)
                    if element and element.is_visible():
                        logger.info(f"【{self.pure_user_id}】找到成功提示: {selector}")
                        return True
                except:
                    continue
            
            logger.warning(f"【{self.pure_user_id}】未找到明确的成功或失败提示")
            return False
            
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】检查验证结果时出错: {str(e)}")
            return False
    
    def check_page_changed(self):
        """检查页面是否改变"""
        try:
            # 检查页面标题是否改变
            current_title = self.page.title()
            logger.info(f"【{self.pure_user_id}】当前页面标题: {current_title}")
            
            # 如果标题不再是验证码相关，说明页面已改变
            if "captcha" not in current_title.lower() and "验证" not in current_title and "拦截" not in current_title:
                logger.info(f"【{self.pure_user_id}】页面标题已改变，验证成功")
                return True
            
            # 检查URL是否改变
            current_url = self.page.url
            logger.info(f"【{self.pure_user_id}】当前页面URL: {current_url}")
            
            # 如果URL不再包含验证码相关参数，说明页面已改变
            if "captcha" not in current_url.lower() and "action=captcha" not in current_url:
                logger.info(f"【{self.pure_user_id}】页面URL已改变，验证成功")
                return True
            
            return False
            
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】检查页面改变时出错: {e}")
            return False
    
    def check_verification_failure(self):
        """检查验证失败提示"""
        try:
            logger.info(f"【{self.pure_user_id}】检查验证失败提示...")
            
            # 等待一下让失败提示出现
            time.sleep(3)
            
            # 检查页面内容中是否包含验证失败相关文字
            page_content = self.page.content()
            failure_keywords = [
                "验证失败",
                "点击框体重试", 
                "重试",
                "失败",
                "请重试",
                "验证码错误",
                "滑动验证失败"
            ]
            
            found_failure = False
            for keyword in failure_keywords:
                if keyword in page_content:
                    logger.info(f"【{self.pure_user_id}】页面内容包含失败关键词: {keyword}")
                    found_failure = True
                    break
            
            if not found_failure:
                logger.info(f"【{self.pure_user_id}】页面内容未包含失败关键词，可能验证真的成功了")
                return True
            
            # 检查各种可能的验证失败提示元素
            failure_selectors = [
                "text=验证失败，点击框体重试",
                "text=验证失败",
                "text=点击框体重试", 
                "text=重试",
                ".nc-lang-cnt",
                "[class*='retry']",
                "[class*='fail']",
                "[class*='error']",
                ".captcha-tips",
                "#captcha-loading",
                ".nc_1_nocaptcha",
                ".nc_wrapper",
                ".nc-container"
            ]
            
            retry_button = None
            for selector in failure_selectors:
                try:
                    element = self.page.query_selector(selector)
                    if element and element.is_visible():
                        # 获取元素文本内容
                        element_text = ""
                        try:
                            element_text = element.text_content()
                        except:
                            pass
                        
                        logger.info(f"【{self.pure_user_id}】找到验证失败提示: {selector}, 文本: {element_text}")
                        retry_button = element
                        break
                except:
                    continue
            
            if retry_button:
                logger.info(f"【{self.pure_user_id}】检测到验证失败提示，但不执行点击操作")
                return False
            else:
                logger.warning(f"【{self.pure_user_id}】未找到验证失败提示元素")
                return False
                
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】检查验证失败时出错: {e}")
            return False
    
    def _analyze_failure(self, attempt: int, slide_distance: float, trajectory_data: dict):
        """分析失败原因并记录"""
        try:
            failure_reason = {
                "attempt": attempt,
                "slide_distance": slide_distance,
                "total_steps": trajectory_data.get("total_steps", 0),
                "base_delay": trajectory_data.get("base_delay", 0),
                "final_left_px": trajectory_data.get("final_left_px", 0),
                "completion_used": trajectory_data.get("completion_used", False),
                "timestamp": datetime.now().isoformat()
            }
            
            # 记录失败信息
            logger.warning(f"【{self.pure_user_id}】第{attempt}次尝试失败 - 距离:{slide_distance}px, "
                         f"步数:{failure_reason['total_steps']}, "
                         f"最终位置:{failure_reason['final_left_px']}px")
            
            return failure_reason
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】分析失败原因时出错: {e}")
            return {}
    
    def solve_slider(self, max_retries: int = 2):
        """处理滑块验证（极速模式）"""
        failure_records = []
        current_strategy = 'ultra_fast'  # 极速策略
        
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"【{self.pure_user_id}】开始处理滑块验证... (第{attempt}/{max_retries}次尝试)")
                
                # 如果不是第一次尝试，短暂等待后重试
                if attempt > 1:
                    retry_delay = random.uniform(0.5, 1.0)  # 减少等待时间
                    logger.info(f"【{self.pure_user_id}】等待{retry_delay:.2f}秒后重试...")
                    time.sleep(retry_delay)
                    
                    # 刷新页面重新加载验证码
                    try:
                        self.page.reload(wait_until='load', timeout=8000)
                        time.sleep(0.5)  # 减少等待
                        logger.info(f"【{self.pure_user_id}】页面已刷新")
                    except Exception as e:
                        logger.warning(f"【{self.pure_user_id}】刷新页面失败: {e}")
                
                # 1. 查找滑块元素
                slider_container, slider_button, slider_track = self.find_slider_elements()
                if not all([slider_container, slider_button, slider_track]):
                    logger.error(f"【{self.pure_user_id}】滑块元素查找失败")
                    continue
                
                # 2. 计算滑动距离
                slide_distance = self.calculate_slide_distance(slider_button, slider_track)
                if slide_distance <= 0:
                    logger.error(f"【{self.pure_user_id}】滑动距离计算失败")
                    continue
                
                # 3. 生成人类化轨迹
                trajectory = self.generate_human_trajectory(slide_distance)
                if not trajectory:
                    logger.error(f"【{self.pure_user_id}】轨迹生成失败")
                    continue
                
                # 4. 模拟滑动
                if not self.simulate_slide(slider_button, trajectory):
                    logger.error(f"【{self.pure_user_id}】滑动模拟失败")
                    continue
                
                # 5. 检查验证结果（极速模式）
                if self.check_verification_success_fast(slider_button):
                    logger.info(f"【{self.pure_user_id}】✅ 滑块验证成功! (第{attempt}次尝试)")
                    
                    # 📊 记录策略成功
                    strategy_stats.record_attempt(attempt, current_strategy, success=True)
                    logger.info(f"【{self.pure_user_id}】📊 记录策略: 第{attempt}次-{current_strategy}策略-成功")
                    
                    # 保存成功记录用于学习
                    if self.enable_learning and hasattr(self, 'current_trajectory_data'):
                        self._save_success_record(self.current_trajectory_data)
                        logger.info(f"【{self.pure_user_id}】已保存成功记录用于参数优化")
                    
                    # 如果不是第一次就成功，记录重试信息
                    if attempt > 1:
                        logger.info(f"【{self.pure_user_id}】经过{attempt}次尝试后验证成功")
                    
                    # 输出当前统计摘要
                    strategy_stats.log_summary()
                    
                    return True
                else:
                    logger.warning(f"【{self.pure_user_id}】❌ 第{attempt}次验证失败")
                    
                    # 📊 记录策略失败
                    strategy_stats.record_attempt(attempt, current_strategy, success=False)
                    logger.info(f"【{self.pure_user_id}】📊 记录策略: 第{attempt}次-{current_strategy}策略-失败")
                    
                    # 分析失败原因
                    if hasattr(self, 'current_trajectory_data'):
                        failure_info = self._analyze_failure(attempt, slide_distance, self.current_trajectory_data)
                        failure_records.append(failure_info)
                    
                    # 如果不是最后一次尝试，继续
                    if attempt < max_retries:
                        continue
                
            except Exception as e:
                logger.error(f"【{self.pure_user_id}】第{attempt}次处理滑块验证时出错: {str(e)}")
                if attempt < max_retries:
                    continue
        
        # 所有尝试都失败了
        logger.error(f"【{self.pure_user_id}】滑块验证失败，已尝试{max_retries}次")
        
        # 输出失败分析摘要
        if failure_records:
            logger.info(f"【{self.pure_user_id}】失败分析摘要:")
            for record in failure_records:
                logger.info(f"  - 第{record['attempt']}次: 距离{record['slide_distance']}px, "
                          f"步数{record['total_steps']}, 最终位置{record['final_left_px']}px")
        
        # 输出当前统计摘要
        strategy_stats.log_summary()
        
        return False
    
    def close_browser(self):
        """安全关闭浏览器并清理资源"""
        logger.info(f"【{self.pure_user_id}】开始清理资源...")
        
        # 清理页面
        try:
            if hasattr(self, 'page') and self.page:
                self.page.close()
                logger.debug(f"【{self.pure_user_id}】页面已关闭")
                self.page = None
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】关闭页面时出错: {e}")
        
        # 清理上下文
        try:
            if hasattr(self, 'context') and self.context:
                self.context.close()
                logger.debug(f"【{self.pure_user_id}】上下文已关闭")
                self.context = None
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】关闭上下文时出错: {e}")
        
        # 【修复】同步关闭浏览器，确保资源真正释放
        try:
            if hasattr(self, 'browser') and self.browser:
                self.browser.close()  # 直接同步关闭，不使用异步任务
                logger.info(f"【{self.pure_user_id}】浏览器已关闭")
                self.browser = None
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】关闭浏览器时出错: {e}")
        
        # 【修复】同步停止Playwright，确保资源真正释放
        try:
            if hasattr(self, 'playwright') and self.playwright:
                self.playwright.stop()  # 直接同步停止，不使用异步任务
                logger.info(f"【{self.pure_user_id}】Playwright已停止")
                self.playwright = None
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】停止Playwright时出错: {e}")
        
        # 清理临时目录
        try:
            if hasattr(self, 'temp_dir') and self.temp_dir:
                shutil.rmtree(self.temp_dir, ignore_errors=True)
                logger.debug(f"【{self.pure_user_id}】临时目录已清理: {self.temp_dir}")
                self.temp_dir = None  # 设置为None，防止重复清理
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】清理临时目录时出错: {e}")
        
        # 注销实例（最后执行，确保其他清理完成）
        try:
            concurrency_manager.unregister_instance(self.user_id)
            stats = concurrency_manager.get_stats()
            logger.info(f"【{self.pure_user_id}】实例已注销，当前并发: {stats['active_count']}/{stats['max_concurrent']}，等待队列: {stats['queue_length']}")
        except Exception as e:
            logger.warning(f"【{self.pure_user_id}】注销实例时出错: {e}")
        
        logger.info(f"【{self.pure_user_id}】资源清理完成")
    
    def __del__(self):
        """析构函数，确保资源释放（保险机制）"""
        try:
            # 检查是否有未关闭的浏览器
            if hasattr(self, 'browser') and self.browser:
                logger.warning(f"【{self.pure_user_id}】析构函数检测到未关闭的浏览器，执行清理")
                self.close_browser()
        except Exception as e:
            # 析构函数中不要抛出异常
            logger.debug(f"【{self.pure_user_id}】析构函数清理时出错: {e}")
    
    def login_with_password_headful(self, account: str = None, password: str = None, show_browser: bool = False):
        """通过浏览器进行密码登录并获取Cookie (使用DrissionPage)
        
        Args:
            account: 登录账号（必填）
            password: 登录密码（必填）
            show_browser: 是否显示浏览器窗口（默认False为无头模式）
                         True: 有头模式，登录后等待5分钟（可手动处理验证码）
                         False: 无头模式，登录后等待10秒
            
        Returns:
            dict: 获取到的cookie字典，失败返回None
        """
        page = None
        try:
            # 检查日期有效性
            if not self._check_date_validity():
                logger.error(f"【{self.pure_user_id}】日期验证失败，无法执行登录")
                return None
            
            # 验证必需参数
            if not account or not password:
                logger.error(f"【{self.pure_user_id}】账号或密码不能为空")
                return None
            
            browser_mode = "有头" if show_browser else "无头"
            logger.info(f"【{self.pure_user_id}】开始{browser_mode}模式密码登录流程（使用DrissionPage）...")
            
            # 导入 DrissionPage
            try:
                from DrissionPage import ChromiumPage, ChromiumOptions
                logger.info(f"【{self.pure_user_id}】DrissionPage导入成功")
            except ImportError:
                logger.error(f"【{self.pure_user_id}】DrissionPage未安装，请执行: pip install DrissionPage")
                return None
            
            # 配置浏览器选项
            logger.info(f"【{self.pure_user_id}】配置浏览器选项（{browser_mode}模式）...")
            co = ChromiumOptions()
            
            # 根据 show_browser 参数决定是否启用无头模式
            if not show_browser:
                co.headless()
                logger.info(f"【{self.pure_user_id}】已启用无头模式")
            else:
                logger.info(f"【{self.pure_user_id}】已启用有头模式（浏览器可见）")
            
            # 设置浏览器参数（反检测）
            co.set_argument('--no-sandbox')
            co.set_argument('--disable-setuid-sandbox')
            co.set_argument('--disable-dev-shm-usage')
            co.set_argument('--disable-blink-features=AutomationControlled')
            co.set_argument('--disable-infobars')
            co.set_argument('--disable-extensions')
            co.set_argument('--disable-popup-blocking')
            co.set_argument('--disable-notifications')
            
            # 无头模式需要的额外参数
            if not show_browser:
                co.set_argument('--disable-gpu')
                co.set_argument('--disable-software-rasterizer')
            else:
                # 有头模式窗口最大化
                co.set_argument('--start-maximized')
            
            # 设置用户代理
            browser_features = self._get_random_browser_features()
            co.set_user_agent(browser_features['user_agent'])
            
            # 禁用自动化特征检测
            co.set_pref('excludeSwitches', ['enable-automation'])
            co.set_pref('useAutomationExtension', False)
            
            # 创建浏览器页面，添加重试机制
            logger.info(f"【{self.pure_user_id}】启动DrissionPage浏览器（{browser_mode}模式）...")
            max_retries = 3
            retry_count = 0
            page = None
            
            while retry_count < max_retries and page is None:
                try:
                    if retry_count > 0:
                        logger.info(f"【{self.pure_user_id}】第 {retry_count + 1} 次尝试启动浏览器...")
                        time.sleep(2)  # 等待2秒后重试
                    
                    page = ChromiumPage(addr_or_opts=co)
                    logger.info(f"【{self.pure_user_id}】浏览器已成功启动（{browser_mode}模式）")
                    break
                    
                except Exception as browser_error:
                    retry_count += 1
                    logger.warning(f"【{self.pure_user_id}】浏览器启动失败 (尝试 {retry_count}/{max_retries}): {str(browser_error)}")
                    
                    if retry_count >= max_retries:
                        logger.error(f"【{self.pure_user_id}】浏览器启动失败，已达到最大重试次数")
                        logger.error(f"【{self.pure_user_id}】可能的原因：")
                        logger.error(f"【{self.pure_user_id}】1. Chrome/Chromium 浏览器未正确安装或路径不正确")
                        logger.error(f"【{self.pure_user_id}】2. 远程调试端口被占用，请关闭其他Chrome实例")
                        logger.error(f"【{self.pure_user_id}】3. 系统资源不足")
                        logger.error(f"【{self.pure_user_id}】建议：")
                        logger.error(f"【{self.pure_user_id}】- 检查Chrome浏览器是否已安装")
                        logger.error(f"【{self.pure_user_id}】- 关闭所有Chrome浏览器窗口后重试")
                        logger.error(f"【{self.pure_user_id}】- 检查任务管理器中是否有残留的chrome.exe进程")
                        raise
                    
                    # 尝试清理可能残留的Chrome进程
                    try:
                        import subprocess
                        import platform
                        if platform.system() == 'Windows':
                            subprocess.run(['taskkill', '/F', '/IM', 'chrome.exe'], 
                                         capture_output=True, timeout=5)
                            logger.info(f"【{self.pure_user_id}】已尝试清理残留Chrome进程")
                    except Exception as cleanup_error:
                        logger.debug(f"【{self.pure_user_id}】清理进程时出错: {cleanup_error}")
            
            if page is None:
                logger.error(f"【{self.pure_user_id}】无法启动浏览器")
                return None
            
            # 访问登录页面
            target_url = "https://www.goofish.com/im"
            logger.info(f"【{self.pure_user_id}】访问登录页面: {target_url}")
            page.get(target_url)
            
            # 等待页面加载
            logger.info(f"【{self.pure_user_id}】等待页面加载...")
            time.sleep(5)
            
            # 检查页面状态
            logger.info(f"【{self.pure_user_id}】========== 页面诊断信息 ==========")
            current_url = page.url
            logger.info(f"【{self.pure_user_id}】当前URL: {current_url}")
            page_title = page.title
            logger.info(f"【{self.pure_user_id}】页面标题: {page_title}")
            
            
            logger.info(f"【{self.pure_user_id}】====================================")
            
            # 查找并点击密码登录标签
            logger.info(f"【{self.pure_user_id}】查找密码登录标签...")
            password_tab_selectors = [
                '.password-login-tab-item',
                'text:密码登录',
                'text:账号密码登录',
            ]
            
            password_tab_found = False
            for selector in password_tab_selectors:
                try:
                    tab = page.ele(selector, timeout=3)
                    if tab:
                        logger.info(f"【{self.pure_user_id}】找到密码登录标签: {selector}")
                        tab.click()
                        logger.info(f"【{self.pure_user_id}】密码登录标签已点击")
                        time.sleep(2)
                        password_tab_found = True
                        break
                except:
                    continue
            
            if not password_tab_found:
                logger.warning(f"【{self.pure_user_id}】未找到密码登录标签，可能页面默认就是密码登录模式")
            
            # 查找登录表单
            logger.info(f"【{self.pure_user_id}】开始检测登录表单...")
            username_selectors = [
                '#fm-login-id',
                'input:name=fm-login-id',
                'input:placeholder^=手机',
                'input:placeholder^=账号',
                'input:type=text',
                '#TPL_username_1',
            ]
            
            login_input = None
            for selector in username_selectors:
                try:
                    login_input = page.ele(selector, timeout=2)
                    if login_input:
                        logger.info(f"【{self.pure_user_id}】找到登录表单: {selector}")
                        break
                except:
                    continue
            
            if not login_input:
                logger.error(f"【{self.pure_user_id}】未找到登录表单")
                return None
            
            # 输入账号
            logger.info(f"【{self.pure_user_id}】输入账号: {account}")
            try:
                login_input.click()
                time.sleep(0.5)
                login_input.input(account)
                logger.info(f"【{self.pure_user_id}】账号已输入")
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"【{self.pure_user_id}】输入账号失败: {str(e)}")
                return None
            
            # 输入密码
            logger.info(f"【{self.pure_user_id}】输入密码...")
            password_selectors = [
                '#fm-login-password',
                'input:name=fm-login-password',
                'input:type=password',
                'input:placeholder^=密码',
                '#TPL_password_1',
            ]
            
            password_input = None
            for selector in password_selectors:
                try:
                    password_input = page.ele(selector, timeout=2)
                    if password_input:
                        logger.info(f"【{self.pure_user_id}】找到密码输入框: {selector}")
                        break
                except:
                    continue
            
            if not password_input:
                logger.error(f"【{self.pure_user_id}】未找到密码输入框")
                return None
            
            try:
                password_input.click()
                time.sleep(0.5)
                password_input.input(password)
                logger.info(f"【{self.pure_user_id}】密码已输入")
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"【{self.pure_user_id}】输入密码失败: {str(e)}")
                return None
            
            # 勾选协议（可选）
            logger.info(f"【{self.pure_user_id}】查找并勾选用户协议...")
            agreement_selectors = [
                '#fm-agreement-checkbox',
                'input:type=checkbox',
            ]
            
            for selector in agreement_selectors:
                try:
                    checkbox = page.ele(selector, timeout=1)
                    if checkbox and not checkbox.states.is_checked:
                        checkbox.click()
                        logger.info(f"【{self.pure_user_id}】用户协议已勾选")
                        time.sleep(0.5)
                        break
                except:
                    continue
            
            # 点击登录按钮
            logger.info(f"【{self.pure_user_id}】点击登录按钮...")
            login_button_selectors = [
                '@class=fm-button fm-submit password-login ',
                '.fm-button.fm-submit.password-login',
                'button.password-login',
                '.password-login',
                'button.fm-submit',
                'text:登录',
            ]
            
            login_button_found = False
            for selector in login_button_selectors:
                try:
                    button = page.ele(selector, timeout=2)
                    if button:
                        logger.info(f"【{self.pure_user_id}】找到登录按钮: {selector}")
                        button.click()
                        logger.info(f"【{self.pure_user_id}】登录按钮已点击")
                        login_button_found = True
                        break
                except:
                    continue
            
            if not login_button_found:
                logger.warning(f"【{self.pure_user_id}】未找到登录按钮，尝试按Enter键...")
                try:
                    password_input.input('\n')  # 模拟按Enter
                    logger.info(f"【{self.pure_user_id}】已按Enter键")
                except Exception as e:
                    logger.error(f"【{self.pure_user_id}】按Enter键失败: {str(e)}")
            
            # 等待登录完成
            logger.info(f"【{self.pure_user_id}】等待登录完成...")
            time.sleep(5)
            
            # 检查当前URL和标题
            current_url = page.url
            logger.info(f"【{self.pure_user_id}】登录后URL: {current_url}")
            page_title = page.title
            logger.info(f"【{self.pure_user_id}】登录后页面标题: {page_title}")
            
            # 根据浏览器模式决定等待时间
            # 有头模式：等待5分钟（用户可能需要手动处理验证码等）
            # 无头模式：等待10秒
            if show_browser:
                wait_seconds = 300  # 5分钟
                logger.info(f"【{self.pure_user_id}】有头模式：等待5分钟让Cookie完全生成（期间可手动处理验证码等）...")
            else:
                wait_seconds = 10
                logger.info(f"【{self.pure_user_id}】无头模式：等待10秒让Cookie完全生成...")
            
            time.sleep(wait_seconds)
            logger.info(f"【{self.pure_user_id}】等待完成，准备获取Cookie")
            
            # 获取Cookie
            logger.info(f"【{self.pure_user_id}】开始获取Cookie...")
            cookies_raw = page.cookies()
            
            # 将cookies转换为字典格式
            cookies = {}
            if isinstance(cookies_raw, list):
                # 如果返回的是列表格式，转换为字典
                for cookie in cookies_raw:
                    if isinstance(cookie, dict) and 'name' in cookie and 'value' in cookie:
                        cookies[cookie['name']] = cookie['value']
                    elif isinstance(cookie, tuple) and len(cookie) >= 2:
                        cookies[cookie[0]] = cookie[1]
            elif isinstance(cookies_raw, dict):
                # 如果已经是字典格式，直接使用
                cookies = cookies_raw
            
            if cookies:
                logger.info(f"【{self.pure_user_id}】成功获取 {len(cookies)} 个Cookie")
                logger.info(f"【{self.pure_user_id}】Cookie名称列表: {list(cookies.keys())}")
                
                # 打印完整的Cookie
                logger.info(f"【{self.pure_user_id}】完整Cookie内容:")
                for name, value in cookies.items():
                    # 对长cookie值进行截断显示
                    if len(value) > 50:
                        display_value = f"{value[:25]}...{value[-25:]}"
                    else:
                        display_value = value
                    logger.info(f"【{self.pure_user_id}】  {name} = {display_value}")
                
                # 将cookie转换为字符串格式
                cookie_str = '; '.join([f"{k}={v}" for k, v in cookies.items()])
                logger.info(f"【{self.pure_user_id}】Cookie字符串格式: {cookie_str[:200]}..." if len(cookie_str) > 200 else f"【{self.pure_user_id}】Cookie字符串格式: {cookie_str}")
                
                logger.info(f"【{self.pure_user_id}】登录成功，准备关闭浏览器")
                
                return cookies
            else:
                logger.error(f"【{self.pure_user_id}】未获取到任何Cookie")
                return None
                
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】密码登录流程出错: {str(e)}")
            import traceback
            logger.error(f"【{self.pure_user_id}】详细错误信息: {traceback.format_exc()}")
            return None
        finally:
            # 关闭浏览器
            logger.info(f"【{self.pure_user_id}】关闭浏览器...")
            try:
                if page:
                    page.quit()
                    logger.info(f"【{self.pure_user_id}】DrissionPage浏览器已关闭")
            except Exception as e:
                logger.warning(f"【{self.pure_user_id}】关闭浏览器时出错: {e}")
    
    def run(self, url: str):
        """运行主流程，返回(成功状态, cookie数据)"""
        cookies = None
        try:
            # 检查日期有效性
            if not self._check_date_validity():
                logger.error(f"【{self.pure_user_id}】日期验证失败，无法执行")
                return False, None
            
            # 初始化浏览器
            self.init_browser()
            
            # 导航到目标URL，快速加载
            logger.info(f"【{self.pure_user_id}】导航到URL: {url}")
            try:
                self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            except Exception as e:
                logger.warning(f"【{self.pure_user_id}】页面加载异常，尝试继续: {str(e)}")
                # 如果页面加载失败，尝试等待一下
                time.sleep(2)
            
            # 短暂延迟，快速处理
            delay = random.uniform(0.3, 0.8)
            logger.info(f"【{self.pure_user_id}】等待页面加载: {delay:.2f}秒")
            time.sleep(delay)
            
            # 快速滚动（可选）
            self.page.mouse.move(640, 360)
            time.sleep(random.uniform(0.02, 0.05))
            self.page.mouse.wheel(0, random.randint(200, 500))
            time.sleep(random.uniform(0.02, 0.05))
            
            # 检查页面标题
            page_title = self.page.title()
            logger.info(f"【{self.pure_user_id}】页面标题: {page_title}")
            
            # 检查页面内容
            page_content = self.page.content()
            if any(keyword in page_content for keyword in ["验证码", "captcha", "滑块", "slider"]):
                logger.info(f"【{self.pure_user_id}】页面内容包含验证码相关关键词")
                
                # 处理滑块验证
                success = self.solve_slider()
                
                if success:
                    logger.info(f"【{self.pure_user_id}】滑块验证成功")
                    
                    # 等待页面完全加载和跳转，让新的cookie生效（快速模式）
                    try:
                        logger.info(f"【{self.pure_user_id}】等待页面加载...")
                        time.sleep(1)  # 快速等待，从3秒减少到1秒
                        
                        # 等待页面跳转或刷新
                        self.page.wait_for_load_state("networkidle", timeout=10000)
                        time.sleep(0.5)  # 快速确认，从2秒减少到0.5秒
                        
                        logger.info(f"【{self.pure_user_id}】页面加载完成，开始获取cookie")
                    except Exception as e:
                        logger.warning(f"【{self.pure_user_id}】等待页面加载时出错: {str(e)}")
                    
                    # 在关闭浏览器前获取cookie
                    try:
                        cookies = self._get_cookies_after_success()
                    except Exception as e:
                        logger.warning(f"【{self.pure_user_id}】获取cookie时出错: {str(e)}")
                else:
                    logger.warning(f"【{self.pure_user_id}】滑块验证失败")
                
                return success, cookies
            else:
                logger.info(f"【{self.pure_user_id}】页面内容不包含验证码相关关键词，可能不需要验证")
                return True, None
                
        except Exception as e:
            logger.error(f"【{self.pure_user_id}】执行过程中出错: {str(e)}")
            return False, None
        finally:
            # 关闭浏览器
            self.close_browser()

def get_slider_stats():
    """获取滑块验证并发统计信息"""
    return concurrency_manager.get_stats()

if __name__ == "__main__":
    # 简单的命令行示例
    import sys
    if len(sys.argv) < 2:
        print("用法: python xianyu_slider_stealth.py <URL>")
        sys.exit(1)
    
    url = sys.argv[1]
    # 第三个参数可以指定 headless 模式，默认为 True（无头）
    headless = sys.argv[2].lower() == 'true' if len(sys.argv) > 2 else True
    slider = XianyuSliderStealth("test_user", enable_learning=True, headless=headless)
    try:
        success, cookies = slider.run(url)
        print(f"验证结果: {'成功' if success else '失败'}")
        if cookies:
            print(f"获取到 {len(cookies)} 个cookies")
    except Exception as e:
        print(f"验证异常: {e}")
