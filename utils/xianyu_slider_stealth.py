#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
闲鱼滑块验证 - 增强反检测版本
基于最新的反检测技术，专门针对闲鱼、淘宝、阿里平台的滑块验证
"""

import time
import random
import logging
import asyncio
import json
import os
from playwright.sync_api import sync_playwright, ElementHandle
from typing import Optional, Tuple, List, Dict, Any

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S.%f'[:-3]
)
logger = logging.getLogger(__name__)

class XianyuSliderStealth:
    
    def __init__(self, user_id: str = "default", enable_learning: bool = True):
        self.user_id = user_id
        self.enable_learning = enable_learning
        self.browser = None
        self.page = None
        self.context = None
        self.playwright = None
        
        # 轨迹学习相关属性
        self.success_history_file = f"trajectory_history/{user_id}_success.json"
        self.trajectory_params = {
            "total_steps_range": [50, 80],
            "base_delay_range": [0.05, 0.12],
            "jitter_x_range": [-2, 2],
            "jitter_y_range": [-1, 1],
            "slow_factor_range": [8, 15],
            "acceleration_phase": 0.15,
            "fast_phase": 0.4,
            "slow_start_ratio_base": 0.8,
            "completion_usage_rate": 0.0,
            "avg_completion_steps": 0.0,
            "trajectory_length_stats": [],
            "learning_enabled": False
        }
        
    def init_browser(self):
        """初始化浏览器 - 增强反检测版本"""
        try:
            self.playwright = sync_playwright().start()
            
            # 随机选择浏览器特征
            browser_features = self._get_random_browser_features()
            
            # 启动浏览器，使用随机特征
            self.browser = self.playwright.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-gpu",
                    "--use-gl=swiftshader",
                    "--disable-web-security",
                    "--disable-features=VizDisplayCompositor",
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
            
            # 创建上下文，使用随机特征
            self.context = self.browser.new_context(
                user_agent=browser_features['user_agent'],
                locale=browser_features['locale'],
                viewport={'width': browser_features['viewport_width'], 'height': browser_features['viewport_height']},
                device_scale_factor=browser_features['device_scale_factor'],
                is_mobile=browser_features['is_mobile'],
                has_touch=browser_features['has_touch'],
                timezone_id=browser_features['timezone_id']
            )
            
            # 创建新页面
            self.page = self.context.new_page()
            
            # 添加增强反检测脚本
            self.page.add_init_script(self._get_stealth_script(browser_features))
            
            return self.page
        except Exception as e:
            logger.error(f"用户 {self.user_id} 初始化浏览器失败: {e}")
            raise
    
    def _load_success_history(self) -> List[Dict[str, Any]]:
        """加载历史成功数据"""
        try:
            if not os.path.exists(self.success_history_file):
                return []
            
            with open(self.success_history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)
                logger.info(f"用户 {self.user_id} 加载历史成功数据: {len(history)}条记录")
                return history
        except Exception as e:
            logger.warning(f"用户 {self.user_id} 加载历史数据失败: {e}")
            return []
    
    def _save_success_record(self, trajectory_data: Dict[str, Any]):
        """保存成功记录"""
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(self.success_history_file), exist_ok=True)
            
            # 加载现有历史
            history = self._load_success_history()
            
            # 添加新记录 - 包含完整轨迹数据
            record = {
                "timestamp": time.time(),
                "user_id": self.user_id,
                "distance": trajectory_data.get("distance", 0),
                "total_steps": trajectory_data.get("total_steps", 0),
                "base_delay": trajectory_data.get("base_delay", 0),
                "jitter_x_range": trajectory_data.get("jitter_x_range", [0, 0]),
                "jitter_y_range": trajectory_data.get("jitter_y_range", [0, 0]),
                "slow_factor": trajectory_data.get("slow_factor", 0),
                "acceleration_phase": trajectory_data.get("acceleration_phase", 0),
                "fast_phase": trajectory_data.get("fast_phase", 0),
                "slow_start_ratio": trajectory_data.get("slow_start_ratio", 0),
                "trajectory_points": trajectory_data.get("trajectory_points", []),
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
            
            logger.info(f"用户 {self.user_id} 保存成功记录: 距离{record['distance']}px, 步数{record['total_steps']}, 轨迹点{len(record['trajectory_points'])}个")
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 保存成功记录失败: {e}")
    
    def _optimize_trajectory_params(self) -> Dict[str, Any]:
        """基于历史成功数据优化轨迹参数"""
        try:
            if not self.enable_learning:
                return self.trajectory_params
            
            history = self._load_success_history()
            if len(history) < 3:  # 至少需要3条成功记录才开始优化
                logger.info(f"用户 {self.user_id} 历史成功数据不足({len(history)}条)，使用默认参数")
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
            
            # 优化参数 - 基于完整轨迹数据学习
            optimized_params = {
                "total_steps_range": [
                    max(30, int(safe_avg(total_steps_list) - safe_std(total_steps_list) * 1.0)),
                    min(120, int(safe_avg(total_steps_list) + safe_std(total_steps_list) * 2.0))
                ],
                "base_delay_range": [
                    max(0.03, safe_avg(base_delay_list) - safe_std(base_delay_list)),
                    min(0.2, safe_avg(base_delay_list) + safe_std(base_delay_list))
                ],
                "jitter_x_range": [-2, 2],  # 保持固定范围
                "jitter_y_range": [-1, 1],  # 保持固定范围
                "slow_factor_range": [
                    max(5, int(safe_avg(slow_factor_list) - safe_std(slow_factor_list))),
                    min(20, int(safe_avg(slow_factor_list) + safe_std(slow_factor_list)))
                ],
                "acceleration_phase": max(0.1, min(0.3, safe_avg(acceleration_phase_list))),
                "fast_phase": max(0.3, min(0.6, safe_avg(fast_phase_list))),
                "slow_start_ratio_base": max(0.7, min(0.9, safe_avg(slow_start_ratio_list))),
                "completion_usage_rate": completion_usage_rate,
                "avg_completion_steps": avg_completion_steps,
                "trajectory_length_stats": trajectory_length_stats,
                "learning_enabled": True
            }
            
            logger.info(f"用户 {self.user_id} 基于{len(history)}条成功记录优化轨迹参数")

            return optimized_params
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 优化轨迹参数失败: {e}")
            return self.trajectory_params
    
    def _get_cookies_after_success(self):
        """滑块验证成功后获取cookie"""
        try:
            logger.info(f"用户 {self.user_id} 开始获取滑块验证成功后的页面cookie...")
            
            # 检查当前页面URL
            current_url = self.page.url
            logger.info(f"用户 {self.user_id} 当前页面URL: {current_url}")
            
            # 检查页面标题
            page_title = self.page.title()
            logger.info(f"用户 {self.user_id} 当前页面标题: {page_title}")
            
            # 等待一下确保cookie完全更新
            time.sleep(1)
            
            # 获取浏览器中的所有cookie
            cookies = self.context.cookies()
            
            if cookies:
                # 将cookie转换为字典格式
                new_cookies = {}
                for cookie in cookies:
                    new_cookies[cookie['name']] = cookie['value']
                
                logger.info(f"用户 {self.user_id} 滑块验证成功后已获取cookie，共{len(new_cookies)}个cookie")
                
                # 记录所有cookie的详细信息
                logger.info(f"用户 {self.user_id} 获取到的所有cookie: {list(new_cookies.keys())}")
                
                # 只提取指定的cookie: _m_h5_tk, _m_h5_tk_enc, cookie2, t, sgcookie, unb, uc1, uc3, uc4
                target_cookies = ['x5sec', '_m_h5_tk', '_m_h5_tk_enc', 'cookie2', 't', 'sgcookie', 'unb', 'uc1', 'uc3', 'uc4']
                filtered_cookies = {}
                
                for cookie_name in target_cookies:
                    if cookie_name in new_cookies:
                        filtered_cookies[cookie_name] = new_cookies[cookie_name]
                        logger.info(f"用户 {self.user_id} 重要cookie已获取: {cookie_name} = {new_cookies[cookie_name]}")
                    else:
                        logger.warning(f"用户 {self.user_id} 重要cookie缺失: {cookie_name}")
                
                # 检查是否有新的cookie值
                old_cookies = getattr(self, '_old_cookies', {})
                new_cookie_count = 0
                for name, value in filtered_cookies.items():
                    if name not in old_cookies or old_cookies[name] != value:
                        new_cookie_count += 1
                        logger.info(f"用户 {self.user_id} 发现新/更新的cookie: {name} = {value}")
                
                logger.info(f"用户 {self.user_id} 发现 {new_cookie_count} 个新/更新的目标cookie")
                
                if filtered_cookies:
                    logger.info(f"用户 {self.user_id} 返回过滤后的cookie: {list(filtered_cookies.keys())}")
                    return filtered_cookies
                else:
                    logger.warning(f"用户 {self.user_id} 未找到目标cookie (_m_h5_tk, _m_h5_tk_enc, cookie2, t, sgcookie, unb, uc1, uc3, uc4)")
                    return None
            else:
                logger.warning(f"用户 {self.user_id} 未获取到任何cookie")
                return None
                
        except Exception as e:
            logger.error(f"用户 {self.user_id} 获取滑块验证成功后的cookie失败: {str(e)}")
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
            
            logger.info(f"用户 {self.user_id} Cookie已保存到文件: {cookie_file}")
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 保存cookie到文件失败: {str(e)}")
    
    def _get_random_browser_features(self):
        """获取随机浏览器特征"""
        # 随机选择窗口大小
        window_sizes = [
            "1366,768", "1920,1080", "1440,900", "1536,864", "1280,720"
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
        """
    
    def generate_human_trajectory(self, distance: float):
        """生成人类化滑动轨迹 - 基于历史数据优化版"""
        try:
            # 基于历史成功数据优化参数
            if self.enable_learning:
                optimized_params = self._optimize_trajectory_params()
            else:
                optimized_params = self.trajectory_params
            
            # 使用优化后的参数
            total_steps = random.randint(
                optimized_params["total_steps_range"][0],
                optimized_params["total_steps_range"][1]
            )
            base_delay = random.uniform(
                optimized_params["base_delay_range"][0],
                optimized_params["base_delay_range"][1]
            )
            
            # 计算缓慢拖动开始位置
            slow_start_ratio = 235.0 / distance if distance > 235 else optimized_params["slow_start_ratio_base"]
            slow_start_ratio = min(slow_start_ratio, 0.9)  # 确保不超过90%
            
            # 使用优化的阶段参数
            acceleration_phase = optimized_params["acceleration_phase"]
            fast_phase = optimized_params["fast_phase"]
            
            # 生成轨迹点
            trajectory = []
            current_x = 0
            
            for i in range(total_steps):
                # 计算当前进度
                progress = i / (total_steps - 1)
                
                # 使用优化的四阶段贝塞尔曲线生成人类化轨迹
                if progress < acceleration_phase:
                    # 初始加速阶段
                    t = progress / acceleration_phase
                    x = distance * acceleration_phase * (t * t * t)
                elif progress < fast_phase:
                    # 快速阶段
                    t = (progress - acceleration_phase) / (fast_phase - acceleration_phase)
                    x = distance * acceleration_phase + distance * (fast_phase - acceleration_phase) * t
                elif progress < slow_start_ratio:
                    # 匀速阶段
                    t = (progress - fast_phase) / (slow_start_ratio - fast_phase)
                    x = distance * fast_phase + distance * (slow_start_ratio - fast_phase) * t
                else:
                    # 缓慢拖动阶段（235px之后）
                    t = (progress - slow_start_ratio) / (1 - slow_start_ratio)
                    # 使用更平缓的曲线，让移动更加缓慢
                    x = distance * slow_start_ratio + distance * (1 - slow_start_ratio) * (1 - (1 - t) * (1 - t) * (1 - t))
                
                # 添加随机抖动 - 使用优化参数
                jitter_x = random.uniform(
                    optimized_params["jitter_x_range"][0],
                    optimized_params["jitter_x_range"][1]
                )
                jitter_y = random.uniform(
                    optimized_params["jitter_y_range"][0],
                    optimized_params["jitter_y_range"][1]
                )
                
                # 在缓慢拖动阶段进一步减少抖动
                if progress >= slow_start_ratio:
                    jitter_x *= 0.3
                    jitter_y *= 0.3
                
                # 确保不超过目标距离
                x = min(x + jitter_x, distance)
                
                # 计算延迟 - 使用优化的缓慢因子
                if progress >= slow_start_ratio:
                    # 缓慢拖动阶段：使用优化的缓慢因子
                    slow_factor = 1 + (progress - slow_start_ratio) * random.uniform(
                        optimized_params["slow_factor_range"][0],
                        optimized_params["slow_factor_range"][1]
                    )
                    delay = base_delay * slow_factor
                elif progress > 0.7:
                    # 普通减速阶段
                    delay = base_delay * (1 + (progress - 0.7) * 3)
                else:
                    delay = base_delay
                
                # 添加随机延迟变化
                delay *= random.uniform(0.8, 1.2)
                
                trajectory.append((x, jitter_y, delay))
                current_x = x
            
            # 确保最后一点是目标距离
            if trajectory:
                trajectory[-1] = (distance, trajectory[-1][1], trajectory[-1][2])
            
            # 准备轨迹数据用于学习 - 包含完整轨迹
            trajectory_data = {
                "distance": distance,
                "total_steps": total_steps,
                "base_delay": base_delay,
                "jitter_x_range": optimized_params["jitter_x_range"],
                "jitter_y_range": optimized_params["jitter_y_range"],
                "slow_factor": random.uniform(
                    optimized_params["slow_factor_range"][0],
                    optimized_params["slow_factor_range"][1]
                ),
                "acceleration_phase": acceleration_phase,
                "fast_phase": fast_phase,
                "slow_start_ratio": slow_start_ratio,
                "trajectory_points": trajectory.copy(),  # 保存完整轨迹点
                "final_left_px": 0,  # 将在拖动过程中更新
                "completion_used": False,  # 是否使用了补全拖动
                "completion_steps": 0  # 补全拖动的步数
            }
            
            # 保存轨迹数据用于后续学习
            self.current_trajectory_data = trajectory_data
            
            logger.info(f"用户 {self.user_id} 生成优化轨迹: {len(trajectory)}步, 总距离: {distance}px, 缓慢拖动开始位置: {distance * slow_start_ratio:.1f}px")
            if self.enable_learning:
                logger.info(f"用户 {self.user_id} 使用历史数据优化参数: 步数{optimized_params['total_steps_range']}, 延迟{optimized_params['base_delay_range']}")
            
            return trajectory
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 生成轨迹时出错: {str(e)}")
            return []
    
    def simulate_slide(self, slider_button: ElementHandle, trajectory):
        """模拟滑动 - 增强人类行为模拟"""
        try:
            logger.info(f"用户 {self.user_id} 开始模拟滑动...")
            
            # 获取滑块按钮中心位置
            button_box = slider_button.bounding_box()
            if not button_box:
                logger.error(f"用户 {self.user_id} 无法获取滑块按钮位置")
                return False
            
            start_x = button_box["x"] + button_box["width"] / 2
            start_y = button_box["y"] + button_box["height"] / 2
            
            # 移动到滑块位置，添加人类行为模拟
            self.page.mouse.move(start_x, start_y)
            time.sleep(random.uniform(1.5, 3.0))  # 增加等待时间
            
            # 模拟鼠标悬停和微调 - 更复杂
            for _ in range(random.randint(3, 6)):
                self.page.mouse.move(
                    start_x + random.uniform(-5, 5), 
                    start_y + random.uniform(-3, 3)
                )
                time.sleep(random.uniform(0.1, 0.4))
            
            # 模拟鼠标点击前的犹豫
            time.sleep(random.uniform(0.8, 1.5))
            
            # 按下鼠标
            self.page.mouse.down()
            time.sleep(random.uniform(0.3, 0.8))  # 增加按下等待时间
            
            # 执行滑动轨迹
            final_left_px = 0  # 记录最终的left值
            for i, (x, y, delay) in enumerate(trajectory):
                # 计算当前位置
                current_x = start_x + x
                current_y = start_y + y
                
                # 移动鼠标，添加微调
                self.page.mouse.move(current_x, current_y)
                
                # 随机暂停，模拟人类思考
                if i % random.randint(2, 8) == 0:
                    pause_time = random.uniform(0.1, 0.5)
                    time.sleep(pause_time)
                
                # 模拟人类的不规律行为 - 增强版
                if random.random() < 0.15:  # 15%概率
                    # 随机回退一点
                    back_x = current_x - random.uniform(2, 6)
                    self.page.mouse.move(back_x, current_y)
                    time.sleep(random.uniform(0.05, 0.15))
                    # 再前进
                    self.page.mouse.move(current_x, current_y)
                
                # 模拟手抖
                if random.random() < 0.1:  # 10%概率
                    shake_x = current_x + random.uniform(-1, 1)
                    shake_y = current_y + random.uniform(-0.5, 0.5)
                    self.page.mouse.move(shake_x, shake_y)
                    time.sleep(random.uniform(0.02, 0.05))
                    self.page.mouse.move(current_x, current_y)
                
                # 延迟
                time.sleep(delay)
                
                # 每5步记录一次进度
                if i % 5 == 0 or i == len(trajectory) - 1:
                    # 获取当前滑块按钮的left值
                    try:
                        current_style = slider_button.get_attribute("style")
                        left_value = "0px"
                        if current_style and "left:" in current_style:
                            import re
                            left_match = re.search(r'left:\s*([^;]+)', current_style)
                            if left_match:
                                left_value = left_match.group(1).strip()
                    except:
                        left_value = f"{x:.1f}px"
                    
                    # 计算进度
                    progress = (i + 1) / len(trajectory) * 100
                    
                    # 检查是否处于缓慢拖动阶段
                    slow_phase = ""
                    try:
                        left_px = float(left_value.replace('px', ''))
                        if left_px >= 235:
                            slow_phase = " [缓慢拖动阶段]"
                        # 记录最终的left值
                        final_left_px = left_px
                        # 更新轨迹数据中的final_left_px
                        if hasattr(self, 'current_trajectory_data'):
                            self.current_trajectory_data["final_left_px"] = final_left_px
                    except:
                        pass
                    
                    logger.info(f"用户 {self.user_id} 滑动进度: {progress:.1f}% ({i+1}/{len(trajectory)}) - left: {left_value}{slow_phase}")
            
            # 检查是否需要补全拖动到258px（使用轨迹执行过程中记录的left值）
            try:
                # 如果left值还没到258px，需要补全
                if final_left_px < 258:
                    remaining_distance = 258 - final_left_px
                    logger.info(f"用户 {self.user_id} 检测到需要补全拖动: 当前left={final_left_px}px, 还需{remaining_distance}px")
                    
                    # 继续之前的拖动轨迹进行补全
                    current_x = start_x + trajectory[-1][0] if trajectory else start_x
                    current_y = start_y + trajectory[-1][1] if trajectory else start_y
                    
                    # 生成补全轨迹点（继续之前的拖动模式）
                    completion_steps = max(3, int(remaining_distance / 5))  # 根据剩余距离生成步数
                    completion_trajectory = []  # 记录补全轨迹
                    
                    for step in range(completion_steps):
                        # 计算补全进度
                        progress = (step + 1) / completion_steps
                        
                        # 使用缓慢的拖动模式（类似轨迹的缓慢阶段）
                        # 使用更平缓的曲线，让移动更加缓慢
                        smooth_progress = 1 - (1 - progress) * (1 - progress) * (1 - progress)
                        move_distance = remaining_distance * smooth_progress
                        
                        # 计算目标位置
                        target_x = current_x + move_distance
                        target_y = current_y + random.uniform(-1, 1)  # 添加微小的Y轴抖动
                        
                        # 移动鼠标
                        self.page.mouse.move(target_x, target_y)
                        
                        # 添加延迟，模拟缓慢拖动
                        delay = random.uniform(0.05, 0.15)
                        time.sleep(delay)
                        
                        # 记录补全轨迹点
                        completion_trajectory.append((move_distance, target_y - current_y, delay))
                        
                        # 每步记录进度
                        if step % 2 == 0 or step == completion_steps - 1:
                            logger.info(f"用户 {self.user_id} 补全拖动进度: {progress*100:.1f}% ({step+1}/{completion_steps}) - 移动{move_distance:.1f}px")
                    
                    # 更新轨迹数据
                    if hasattr(self, 'current_trajectory_data'):
                        self.current_trajectory_data["completion_used"] = True
                        self.current_trajectory_data["completion_steps"] = completion_steps
                        # 将补全轨迹添加到主轨迹中
                        self.current_trajectory_data["trajectory_points"].extend(completion_trajectory)
                        self.current_trajectory_data["final_left_px"] = 258  # 更新最终位置
                    
                    logger.info(f"用户 {self.user_id} 补全拖动完成: 从{final_left_px}px补全到258px")
                    
            except Exception as e:
                logger.warning(f"用户 {self.user_id} 检查补全拖动时出错: {str(e)}")
            
            # 稍微回退一点，模拟人类可能的过冲
            if len(trajectory) > 0:
                final_x = start_x + trajectory[-1][0]
                back_x = final_x - random.randint(3, 8)
                self.page.mouse.move(back_x, start_y + trajectory[-1][1])
                time.sleep(random.uniform(0.1, 0.3))
                
                # 再前进到最终位置
                self.page.mouse.move(final_x, start_y + trajectory[-1][1])
                time.sleep(random.uniform(0.1, 0.2))
            
            # 释放鼠标
            self.page.mouse.up()
            logger.info(f"用户 {self.user_id} 滑动完成")
            
            return True
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 模拟滑动时出错: {str(e)}")
            return False
    
    def find_slider_elements(self):
        """查找滑块元素"""
        try:
            # 等待页面加载
            time.sleep(3)
            
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
                        logger.info(f"用户 {self.user_id} 找到滑块容器: {selector}")
                        slider_container = element
                        break
                except Exception as e:
                    logger.debug(f"用户 {self.user_id} 选择器 {selector} 未找到: {e}")
                    continue
            
            if not slider_container:
                logger.error(f"用户 {self.user_id} 未找到任何滑块容器")
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
                        logger.info(f"用户 {self.user_id} 找到滑块按钮: {selector}")
                        slider_button = element
                        break
                except Exception as e:
                    logger.debug(f"用户 {self.user_id} 选择器 {selector} 未找到: {e}")
                    continue
            
            if not slider_button:
                logger.error(f"用户 {self.user_id} 未找到任何滑块按钮")
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
                        logger.info(f"用户 {self.user_id} 找到滑块轨道: {selector}")
                        slider_track = element
                        break
                except Exception as e:
                    logger.debug(f"用户 {self.user_id} 选择器 {selector} 未找到: {e}")
                    continue
            
            if not slider_track:
                logger.error(f"用户 {self.user_id} 未找到任何滑块轨道")
                return slider_container, slider_button, None
            
            return slider_container, slider_button, slider_track
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 查找滑块元素时出错: {str(e)}")
            return None, None, None
    
    def calculate_slide_distance(self, slider_button: ElementHandle, slider_track: ElementHandle):
        """计算滑动距离"""
        try:
            # 获取滑块按钮位置和大小
            button_box = slider_button.bounding_box()
            if not button_box:
                logger.error(f"用户 {self.user_id} 无法获取滑块按钮位置")
                return 0
            
            # 获取滑块轨道位置和大小
            track_box = slider_track.bounding_box()
            if not track_box:
                logger.error(f"用户 {self.user_id} 无法获取滑块轨道位置")
                return 0
            
            # 计算滑动距离 (轨道宽度 - 滑块宽度)
            slide_distance = track_box["width"] - button_box["width"]
            logger.info(f"用户 {self.user_id} 计算滑动距离: {slide_distance}px (轨道宽度: {track_box['width']}px, 滑块宽度: {button_box['width']}px)")
            
            return slide_distance
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 计算滑动距离时出错: {str(e)}")
            return 0
    
    def check_verification_success(self, slider_button: ElementHandle):
        """检查验证结果"""
        try:
            logger.info(f"用户 {self.user_id} 检查验证结果...")
            
            # 等待验证结果
            time.sleep(3)
            
            # 检查滑块按钮的left属性是否改变
            try:
                current_style = slider_button.get_attribute("style")
                if current_style and "left:" in current_style:
                    import re
                    left_match = re.search(r'left:\s*([^;]+)', current_style)
                    if left_match:
                        left_value = left_match.group(1).strip()
                        logger.info(f"用户 {self.user_id} 滑块最终位置: {left_value}")
                        
                        # 如果left值大于0，说明滑块被移动了
                        try:
                            left_px = float(left_value.replace('px', ''))
                            if left_px > 0:
                                logger.info(f"用户 {self.user_id} 滑块已移动，检查页面是否改变...")
                                
                                # 检查页面是否改变
                                if self.check_page_changed():
                                    logger.info(f"用户 {self.user_id} 页面已改变，验证成功")
                                    return True
                                else:
                                    logger.warning(f"用户 {self.user_id} 页面未改变，检查验证失败提示...")
                                    return self.check_verification_failure()
                        except:
                            pass
            except:
                pass
            
            # 检查滑块容器是否消失
            try:
                container = self.page.query_selector(".nc-container")
                if not container or not container.is_visible():
                    logger.info(f"用户 {self.user_id} 滑块容器已消失，验证成功")
                    return True
                else:
                    logger.warning(f"用户 {self.user_id} 滑块容器仍存在，验证失败")
                    return False
            except:
                pass
            
            # 检查滑块轨道是否消失
            try:
                track = self.page.query_selector("#nc_1_n1t")
                if not track or not track.is_visible():
                    logger.info(f"用户 {self.user_id} 滑块轨道已消失，验证成功")
                    return True
                else:
                    logger.warning(f"用户 {self.user_id} 滑块轨道仍存在，验证失败")
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
                        logger.info(f"用户 {self.user_id} 找到成功提示: {selector}")
                        return True
                except:
                    continue
            
            logger.warning(f"用户 {self.user_id} 未找到明确的成功或失败提示")
            return False
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 检查验证结果时出错: {str(e)}")
            return False
    
    def check_page_changed(self):
        """检查页面是否改变"""
        try:
            # 检查页面标题是否改变
            current_title = self.page.title()
            logger.info(f"用户 {self.user_id} 当前页面标题: {current_title}")
            
            # 如果标题不再是验证码相关，说明页面已改变
            if "captcha" not in current_title.lower() and "验证" not in current_title and "拦截" not in current_title:
                logger.info(f"用户 {self.user_id} 页面标题已改变，验证成功")
                return True
            
            # 检查URL是否改变
            current_url = self.page.url
            logger.info(f"用户 {self.user_id} 当前页面URL: {current_url}")
            
            # 如果URL不再包含验证码相关参数，说明页面已改变
            if "captcha" not in current_url.lower() and "action=captcha" not in current_url:
                logger.info(f"用户 {self.user_id} 页面URL已改变，验证成功")
                return True
            
            return False
            
        except Exception as e:
            logger.warning(f"用户 {self.user_id} 检查页面改变时出错: {e}")
            return False
    
    def check_verification_failure(self):
        """检查验证失败提示"""
        try:
            logger.info(f"用户 {self.user_id} 检查验证失败提示...")
            
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
                    logger.info(f"用户 {self.user_id} 页面内容包含失败关键词: {keyword}")
                    found_failure = True
                    break
            
            if not found_failure:
                logger.info(f"用户 {self.user_id} 页面内容未包含失败关键词，可能验证真的成功了")
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
                        
                        logger.info(f"用户 {self.user_id} 找到验证失败提示: {selector}, 文本: {element_text}")
                        retry_button = element
                        break
                except:
                    continue
            
            if retry_button:
                logger.info(f"用户 {self.user_id} 检测到验证失败提示，但不执行点击操作")
                return False
            else:
                logger.warning(f"用户 {self.user_id} 未找到验证失败提示元素")
                return False
                
        except Exception as e:
            logger.error(f"用户 {self.user_id} 检查验证失败时出错: {e}")
            return False
    
    def solve_slider(self):
        """处理滑块验证"""
        try:
            logger.info(f"用户 {self.user_id} 开始处理滑块验证...")
            
            # 1. 查找滑块元素
            slider_container, slider_button, slider_track = self.find_slider_elements()
            if not all([slider_container, slider_button, slider_track]):
                logger.error(f"用户 {self.user_id} 滑块元素查找失败")
                return False
            
            # 2. 计算滑动距离
            slide_distance = self.calculate_slide_distance(slider_button, slider_track)
            if slide_distance <= 0:
                logger.error(f"用户 {self.user_id} 滑动距离计算失败")
                return False
            
            # 3. 生成人类化轨迹
            trajectory = self.generate_human_trajectory(slide_distance)
            if not trajectory:
                logger.error(f"用户 {self.user_id} 轨迹生成失败")
                return False
            
            # 4. 模拟滑动
            if not self.simulate_slide(slider_button, trajectory):
                logger.error(f"用户 {self.user_id} 滑动模拟失败")
                return False
            
            # 5. 检查验证结果
            if self.check_verification_success(slider_button):
                logger.info(f"用户 {self.user_id} 滑块验证成功!")
                
                # 保存成功记录用于学习
                if self.enable_learning and hasattr(self, 'current_trajectory_data'):
                    self._save_success_record(self.current_trajectory_data)
                    logger.info(f"用户 {self.user_id} 已保存成功记录用于参数优化")
                
                return True
            else:
                logger.warning(f"用户 {self.user_id} 滑块验证失败")
                return False
                
        except Exception as e:
            logger.error(f"用户 {self.user_id} 处理滑块验证时出错: {str(e)}")
            return False
    
    def close_browser(self):
        """安全关闭浏览器"""
        try:
            if hasattr(self, 'browser') and self.browser:
                self.browser.close()
                logger.info(f"用户 {self.user_id} 浏览器已关闭")
                self.browser = None
        except Exception as e:
            logger.warning(f"用户 {self.user_id} 关闭浏览器时出错: {e}")
        
        try:
            if hasattr(self, 'playwright') and self.playwright:
                self.playwright.stop()
                logger.info(f"用户 {self.user_id} Playwright已停止")
                self.playwright = None
        except Exception as e:
            logger.warning(f"用户 {self.user_id} 停止Playwright时出错: {e}")
    
    def run(self, url: str):
        """运行主流程，返回(成功状态, cookie数据)"""
        cookies = None
        try:
            # 初始化浏览器
            self.init_browser()
            
            # 导航到目标URL，添加随机延迟
            logger.info(f"用户 {self.user_id} 导航到URL: {url}")
            self.page.goto(url, wait_until="networkidle", timeout=60000)
            
            # 保存初始cookie用于比较
            try:
                initial_cookies = self.context.cookies()
                self._old_cookies = {}
                for cookie in initial_cookies:
                    self._old_cookies[cookie['name']] = cookie['value']
                logger.info(f"用户 {self.user_id} 已保存初始cookie，共{len(self._old_cookies)}个")
            except Exception as e:
                logger.warning(f"用户 {self.user_id} 保存初始cookie失败: {str(e)}")
                self._old_cookies = {}
            
            # 随机延迟，模拟人类行为
            delay = random.uniform(5, 10)
            logger.info(f"用户 {self.user_id} 等待页面加载: {delay:.2f}秒")
            time.sleep(delay)
            
            # 模拟人类滚动行为
            self.page.mouse.move(640, 360)
            time.sleep(random.uniform(0.5, 1.0))
            self.page.mouse.wheel(0, random.randint(200, 500))
            time.sleep(random.uniform(0.5, 1.0))
            
            # 检查页面标题
            page_title = self.page.title()
            logger.info(f"用户 {self.user_id} 页面标题: {page_title}")
            
            # 检查页面内容
            page_content = self.page.content()
            if any(keyword in page_content for keyword in ["验证码", "captcha", "滑块", "slider"]):
                logger.info(f"用户 {self.user_id} 页面内容包含验证码相关关键词")
                
                # 处理滑块验证
                success = self.solve_slider()
                
                if success:
                    logger.info(f"用户 {self.user_id} 滑块验证成功")
                    
                    # 等待页面完全加载和跳转，让新的cookie生效
                    try:
                        logger.info(f"用户 {self.user_id} 等待页面完全加载...")
                        time.sleep(3)  # 等待页面状态稳定
                        
                        # 等待页面跳转或刷新
                        self.page.wait_for_load_state("networkidle", timeout=10000)
                        time.sleep(2)  # 额外等待确保cookie更新
                        
                        logger.info(f"用户 {self.user_id} 页面加载完成，开始获取cookie")
                    except Exception as e:
                        logger.warning(f"用户 {self.user_id} 等待页面加载时出错: {str(e)}")
                    
                    # 在关闭浏览器前获取cookie
                    try:
                        cookies = self._get_cookies_after_success()
                    except Exception as e:
                        logger.warning(f"用户 {self.user_id} 获取cookie时出错: {str(e)}")
                else:
                    logger.warning(f"用户 {self.user_id} 滑块验证失败")
                
                return success, cookies
            else:
                logger.info(f"用户 {self.user_id} 页面内容不包含验证码相关关键词，可能不需要验证")
                return True, None
            
        except Exception as e:
            logger.error(f"用户 {self.user_id} 执行过程中出错: {str(e)}")
            return False, None
        finally:
            # 关闭浏览器
            self.close_browser()

def process_user_url(user_id: str, url: str, enable_learning: bool = True):
    """处理用户URL的滑块验证 - 增强反检测版本，返回(成功状态, cookie数据)"""
    slider = XianyuSliderStealth(user_id, enable_learning)
    try:
        # run方法已经返回(成功状态, cookie数据)
        return slider.run(url)
    except Exception as e:
        logger.error(f"用户 {user_id} 滑块验证处理异常: {str(e)}")
        return False, None
    finally:
        # 安全关闭浏览器（run方法中已经会调用close_browser）
        slider.close_browser()

if __name__ == "__main__":
    # 简单的命令行示例
    import sys
    if len(sys.argv) < 2:
        print("用法: python xianyu_slider_stealth.py <URL>")
        sys.exit(1)
    
    url = sys.argv[1]
    result = process_user_url("test_user", url)
    print(f"验证结果: {'成功' if result else '失败'}")
