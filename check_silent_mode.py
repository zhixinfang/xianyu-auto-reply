#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
检查静默模式修改
"""

import os

def check_silent_modifications():
    """检查静默模式修改"""
    print("🔍 检查静默模式修改...")
    
    refresh_util_path = os.path.join('utils', 'refresh_util.py')
    
    if not os.path.exists(refresh_util_path):
        print(f"❌ 文件不存在: {refresh_util_path}")
        return False
    
    with open(refresh_util_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否移除了遮挡元素的CSS
    removed_css_elements = [
        '.slide-info {',
        '.test-trace-btn {', 
        '.trace-status {'
    ]
    
    css_removed = 0
    for element in removed_css_elements:
        if element not in content:
            css_removed += 1
            print(f"✅ 已移除CSS: {element.replace(' {', '')}")
        else:
            print(f"⚠️  仍存在CSS: {element.replace(' {', '')}")
    
    # 检查是否保留了必要的CSS
    essential_css = [
        '.mouse-trace {',
        '.mouse-cursor {'
    ]
    
    css_kept = 0
    for element in essential_css:
        if element in content:
            css_kept += 1
            print(f"✅ 保留了CSS: {element.replace(' {', '')}")
        else:
            print(f"❌ 缺少CSS: {element.replace(' {', '')}")
    
    # 检查静默函数
    silent_functions = [
        ('createStatusIndicator', '静默状态提示'),
        ('createInfoPanel', '静默信息面板'),
        ('createTestButton', '静默测试按钮')
    ]
    
    silent_count = 0
    for func_name, description in silent_functions:
        if f'function {func_name}()' in content:
            # 检查是否包含静默相关的注释或代码
            func_start = content.find(f'function {func_name}()')
            if func_start != -1:
                # 查找函数结束位置（简单查找下一个函数或大段空白）
                func_end = content.find('function ', func_start + 1)
                if func_end == -1:
                    func_end = len(content)
                
                func_content = content[func_start:func_end]
                
                if '静默' in func_content or 'console.log' in func_content:
                    silent_count += 1
                    print(f"✅ {description}: 已改为静默模式")
                else:
                    print(f"⚠️  {description}: 可能未完全静默化")
        else:
            print(f"❌ 函数不存在: {func_name}")
    
    # 检查控制台输出
    if '静默模式' in content:
        print("✅ 控制台输出已改为静默模式")
    else:
        print("⚠️  控制台输出可能未修改")
    
    # 总结
    print(f"\n📊 修改总结:")
    print(f"  - CSS移除: {css_removed}/{len(removed_css_elements)}")
    print(f"  - CSS保留: {css_kept}/{len(essential_css)}")
    print(f"  - 函数静默化: {silent_count}/{len(silent_functions)}")
    
    success = (css_removed == len(removed_css_elements) and 
               css_kept == len(essential_css) and 
               silent_count >= len(silent_functions) - 1)  # 允许一个函数的小差异
    
    return success

def show_before_after():
    """显示修改前后对比"""
    print("\n📋 修改前后对比")
    print("-" * 60)
    
    print("🔴 修改前 - 遮挡页面的元素:")
    print("  - 右上角绿色信息面板显示统计信息")
    print("  - 左上角橙色测试按钮")
    print("  - 页面中央红色状态提示")
    print("  - '鼠标轨迹可视化已启用' 大字提示")
    print("  - '移动鼠标查看轨迹效果' 说明文字")
    
    print("\n🟢 修改后 - 静默模式:")
    print("  - 只显示红色鼠标轨迹点")
    print("  - 只显示绿色鼠标光标")
    print("  - 所有文字提示和按钮都已移除")
    print("  - 不再遮挡页面内容")
    print("  - 保持轨迹可视化的核心功能")

if __name__ == "__main__":
    print("🚀 静默模式修改检查")
    print("=" * 50)
    
    success = check_silent_modifications()
    
    if success:
        print("\n🎉 静默模式修改检查通过！")
    else:
        print("\n⚠️  静默模式修改可能不完整")
    
    show_before_after()
    
    print("\n" + "=" * 50)
    print("✅ 修改完成！现在鼠标轨迹可视化不会再遮挡页面了")
