"""
自动确认发货模块 - 解密版本
这是secure_confirm_ultra.py的解密版本，用于自动确认发货功能
"""

import asyncio
import json
import time
import aiohttp
from loguru import logger
from utils.xianyu_utils import generate_sign, trans_cookies


class SecureConfirm:
    """自动确认发货类"""

    def __init__(self, session, cookies_str, cookie_id, main_instance=None):
        """
        初始化确认发货实例

        Args:
            session: aiohttp会话对象
            cookies_str: Cookie字符串
            cookie_id: Cookie ID
            main_instance: 主实例对象（XianyuLive）
        """
        self.session = session
        self.cookies_str = cookies_str
        self.cookie_id = cookie_id
        self.main_instance = main_instance

        # 解析cookies
        self.cookies = trans_cookies(cookies_str) if cookies_str else {}

        # Token相关属性
        self.current_token = None
        self.last_token_refresh_time = 0
        self.token_refresh_interval = 3600  # 1小时

    def _safe_str(self, obj):
        """安全字符串转换"""
        try:
            return str(obj)
        except:
            return "无法转换的对象"

    async def _get_real_item_id(self):
        """从数据库中获取一个真实的商品ID"""
        try:
            from db_manager import db_manager
            
            # 获取该账号的商品列表
            items = db_manager.get_items_by_cookie(self.cookie_id)
            if items:
                # 返回第一个商品的ID
                item_id = items[0].get('item_id')
                if item_id:
                    logger.debug(f"【{self.cookie_id}】获取到真实商品ID: {item_id}")
                    return item_id
            
            # 如果该账号没有商品，尝试获取任意一个商品ID
            all_items = db_manager.get_all_items()
            if all_items:
                item_id = all_items[0].get('item_id')
                if item_id:
                    logger.debug(f"【{self.cookie_id}】使用其他账号的商品ID: {item_id}")
                    return item_id
            
            logger.warning(f"【{self.cookie_id}】数据库中没有找到任何商品ID")
            return None
            
        except Exception as e:
            logger.error(f"【{self.cookie_id}】获取真实商品ID失败: {self._safe_str(e)}")
            return None

    async def refresh_token_by_detail_api(self, retry_count=0):
        """通过商品详情API刷新token - 参照get_item_info方法"""
        if retry_count >= 3:  # 最多重试2次
            logger.error(f"【{self.cookie_id}】通过详情API刷新token失败，重试次数过多")
            return False

        try:
            # 优先使用传入的item_id，否则从数据库获取
            real_item_id = None
            if hasattr(self, '_current_item_id') and self._current_item_id:
                real_item_id = self._current_item_id
                logger.debug(f"【{self.cookie_id}】使用传入的商品ID: {real_item_id}")
            else:
                # 从数据库中获取一个真实的商品ID来请求详情API
                real_item_id = await self._get_real_item_id()

            if not real_item_id:
                logger.warning(f"【{self.cookie_id}】无法获取真实商品ID，使用默认ID")
                real_item_id = "123456789"  # 备用ID
            
            params = {
                'jsv': '2.7.2',
                'appKey': '34839810',
                't': str(int(time.time()) * 1000),
                'sign': '',
                'v': '1.0',
                'type': 'originaljson',
                'accountSite': 'xianyu',
                'dataType': 'json',
                'timeout': '20000',
                'api': 'mtop.taobao.idle.pc.detail',
                'sessionOption': 'AutoLoginOnly',
            }

            data_val = f'{{"itemId":"{real_item_id}"}}'
            data = {
                'data': data_val,
            }

            # 从当前cookies中获取token
            token = trans_cookies(self.cookies_str).get('_m_h5_tk', '').split('_')[0] if trans_cookies(self.cookies_str).get('_m_h5_tk') else ''
            
            if token:
                logger.debug(f"【{self.cookie_id}】使用当前token刷新: {token}")
            else:
                logger.warning(f"【{self.cookie_id}】当前cookies中没有找到token")

            # 生成签名
            sign = generate_sign(params['t'], token, data_val)
            params['sign'] = sign

            logger.info(f"【{self.cookie_id}】通过详情API刷新token，使用商品ID: {real_item_id}")
            
            async with self.session.post(
                'https://h5api.m.goofish.com/h5/mtop.taobao.idle.pc.detail/1.0/',
                params=params,
                data=data
            ) as response:
                # 检查并更新Cookie
                if 'set-cookie' in response.headers:
                    new_cookies = {}
                    for cookie in response.headers.getall('set-cookie', []):
                        if '=' in cookie:
                            name, value = cookie.split(';')[0].split('=', 1)
                            new_cookies[name.strip()] = value.strip()
                    
                    # 更新cookies
                    if new_cookies:
                        self.cookies.update(new_cookies)
                        # 生成新的cookie字符串
                        self.cookies_str = '; '.join([f"{k}={v}" for k, v in self.cookies.items()])
                        # 更新数据库中的Cookie
                        await self._update_config_cookies()
                        logger.debug(f"【{self.cookie_id}】已通过详情API更新Cookie到数据库")
                        
                        # 获取新的token
                        new_token = trans_cookies(self.cookies_str).get('_m_h5_tk', '').split('_')[0] if trans_cookies(self.cookies_str).get('_m_h5_tk') else ''
                        if new_token and new_token != token:
                            self.current_token = new_token
                            self.last_token_refresh_time = time.time()
                            logger.info(f"【{self.cookie_id}】通过详情API成功刷新token: {new_token}")
                            return True
                        else:
                            logger.debug(f"【{self.cookie_id}】详情API返回的token未变化")
                
                # 检查响应状态
                try:
                    res_json = await response.json()
                    if isinstance(res_json, dict):
                        ret_value = res_json.get('ret', [])
                        if any('SUCCESS::调用成功' in ret for ret in ret_value):
                            logger.debug(f"【{self.cookie_id}】详情API调用成功")
                            return True
                        else:
                            logger.warning(f"【{self.cookie_id}】详情API调用失败: {ret_value}")
                            if retry_count < 2:
                                await asyncio.sleep(0.5)
                                return await self.refresh_token_by_detail_api(retry_count + 1)
                except:
                    logger.debug(f"【{self.cookie_id}】详情API响应解析失败，但可能已获取到新cookies")
                
                return bool(self.current_token)

        except Exception as e:
            logger.error(f"【{self.cookie_id}】通过详情API刷新token异常: {self._safe_str(e)}")
            if retry_count < 2:
                await asyncio.sleep(0.5)
                return await self.refresh_token_by_detail_api(retry_count + 1)
            return False

    async def _update_config_cookies(self):
        """更新数据库中的Cookie配置"""
        try:
            from db_manager import db_manager
            # 更新数据库中的cookies
            db_manager.update_cookie_value(self.cookie_id, self.cookies_str)
            logger.debug(f"【{self.cookie_id}】已更新数据库中的Cookie")
        except Exception as e:
            logger.error(f"【{self.cookie_id}】更新数据库Cookie失败: {self._safe_str(e)}")

    async def refresh_token(self):
        """刷新token - 优先使用详情API，失败时调用主界面类的方法"""
        # 首先尝试通过详情API刷新token
        success = await self.refresh_token_by_detail_api()
        if success:
            return self.current_token
        
        # 如果详情API失败，尝试调用主界面类的方法
        if self.main_instance and hasattr(self.main_instance, 'refresh_token'):
            try:
                logger.debug(f"【{self.cookie_id}】详情API刷新失败，调用主界面类的refresh_token方法")
                new_token = await self.main_instance.refresh_token()
                if new_token:
                    self.current_token = new_token
                    self.last_token_refresh_time = time.time()
                    # 更新本地的cookies_str
                    self.cookies_str = self.main_instance.cookies_str
                    # 重新解析cookies
                    self.cookies = {}
                    if self.cookies_str:
                        for cookie in self.cookies_str.split(';'):
                            if '=' in cookie:
                                key, value = cookie.strip().split('=', 1)
                                self.cookies[key] = value
                    logger.debug(f"【{self.cookie_id}】通过主界面类Token刷新成功，已同步cookies")
                    return new_token
                else:
                    logger.warning(f"【{self.cookie_id}】主界面类Token刷新失败")
                    return None
            except Exception as e:
                logger.error(f"【{self.cookie_id}】调用主界面类refresh_token失败: {self._safe_str(e)}")
                return None
        else:
            logger.warning(f"【{self.cookie_id}】主界面类实例不存在或没有refresh_token方法")
            return None

    async def auto_confirm(self, order_id, item_id=None, retry_count=0):
        """自动确认发货 - 使用真实商品ID刷新token"""
        if retry_count >= 4:  # 最多重试3次
            logger.error("自动确认发货失败，重试次数过多")
            return {"error": "自动确认发货失败，重试次数过多"}

        # 保存item_id供Token刷新使用
        if item_id:
            self._current_item_id = item_id
            logger.debug(f"【{self.cookie_id}】设置当前商品ID: {item_id}")

        # 如果是重试（retry_count > 0），强制刷新token
        if retry_count > 0:
            old_token = trans_cookies(self.cookies_str).get('_m_h5_tk', '').split('_')[0] if trans_cookies(self.cookies_str).get('_m_h5_tk') else ''
            logger.info(f"【{self.cookie_id}】重试第{retry_count}次，强制刷新token... 当前_m_h5_tk: {old_token}")
            await self.refresh_token()
            new_token = trans_cookies(self.cookies_str).get('_m_h5_tk', '').split('_')[0] if trans_cookies(self.cookies_str).get('_m_h5_tk') else ''
            logger.info(f"【{self.cookie_id}】重试刷新token完成，新的_m_h5_tk: {new_token}")
        else:
            # 确保使用最新的token（首次调用时的正常逻辑）
            if not self.current_token or (time.time() - self.last_token_refresh_time) >= self.token_refresh_interval:
                old_token = trans_cookies(self.cookies_str).get('_m_h5_tk', '').split('_')[0] if trans_cookies(self.cookies_str).get('_m_h5_tk') else ''
                logger.info(f"【{self.cookie_id}】Token过期或不存在，刷新token... 当前_m_h5_tk: {old_token}")
                await self.refresh_token()
                new_token = trans_cookies(self.cookies_str).get('_m_h5_tk', '').split('_')[0] if trans_cookies(self.cookies_str).get('_m_h5_tk') else ''
                logger.info(f"【{self.cookie_id}】Token刷新完成，新的_m_h5_tk: {new_token}")

        # 确保session已创建
        if not self.session:
            raise Exception("Session未创建")

        params = {
            'jsv': '2.7.2',
            'appKey': '34839810',
            't': str(int(time.time()) * 1000),
            'sign': '',
            'v': '1.0',
            'type': 'originaljson',
            'accountSite': 'xianyu',
            'dataType': 'json',
            'timeout': '20000',
            'api': 'mtop.taobao.idle.logistic.consign.dummy',
            'sessionOption': 'AutoLoginOnly',
        }

        data_val = '{"orderId":"' + order_id + '", "tradeText":"","picList":[],"newUnconsign":true}'
        data = {
            'data': data_val,
        }

        # 始终从最新的cookies中获取_m_h5_tk token（刷新后cookies会被更新）
        token = trans_cookies(self.cookies_str).get('_m_h5_tk', '').split('_')[0] if trans_cookies(self.cookies_str).get('_m_h5_tk') else ''

        if token:
            logger.info(f"使用cookies中的_m_h5_tk token: {token}")
        else:
            logger.warning("cookies中没有找到_m_h5_tk token")

        sign = generate_sign(params['t'], token, data_val)
        params['sign'] = sign

        try:
            logger.info(f"【{self.cookie_id}】开始自动确认发货，订单ID: {order_id}")
            async with self.session.post(
                'https://h5api.m.goofish.com/h5/mtop.taobao.idle.logistic.consign.dummy/1.0/',
                params=params,
                data=data
            ) as response:
                res_json = await response.json()

                # 检查并更新Cookie
                if 'set-cookie' in response.headers:
                    new_cookies = {}
                    for cookie in response.headers.getall('set-cookie', []):
                        if '=' in cookie:
                            name, value = cookie.split(';')[0].split('=', 1)
                            new_cookies[name.strip()] = value.strip()

                    # 更新cookies
                    if new_cookies:
                        self.cookies.update(new_cookies)
                        # 生成新的cookie字符串
                        self.cookies_str = '; '.join([f"{k}={v}" for k, v in self.cookies.items()])
                        # 更新数据库中的Cookie
                        await self._update_config_cookies()
                        logger.debug("已更新Cookie到数据库")

                logger.info(f"【{self.cookie_id}】自动确认发货响应: {res_json}")

                # 检查响应结果
                if res_json.get('ret') and res_json['ret'][0] == 'SUCCESS::调用成功':
                    logger.info(f"【{self.cookie_id}】✅ 自动确认发货成功，订单ID: {order_id}")
                    return {"success": True, "order_id": order_id}
                else:
                    error_msg = res_json.get('ret', ['未知错误'])[0] if res_json.get('ret') else '未知错误'
                    logger.warning(f"【{self.cookie_id}】❌ 自动确认发货失败: {error_msg}")

                    # 如果是token相关错误，进行重试
                    if 'token' in error_msg.lower() or 'sign' in error_msg.lower():
                        logger.info(f"【{self.cookie_id}】检测到token错误，准备重试...")
                        return await self.auto_confirm(order_id, item_id, retry_count + 1)

                    return {"error": error_msg, "order_id": order_id}

        except Exception as e:
            logger.error(f"【{self.cookie_id}】自动确认发货API请求异常: {self._safe_str(e)}")
            await asyncio.sleep(0.5)

            # 网络异常也进行重试
            if retry_count < 2:
                logger.info(f"【{self.cookie_id}】网络异常，准备重试...")
                return await self.auto_confirm(order_id, item_id, retry_count + 1)

            return {"error": f"网络异常: {self._safe_str(e)}", "order_id": order_id}
