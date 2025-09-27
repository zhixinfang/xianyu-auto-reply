#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 utils/xianyu_slider_stealth.py 编译为可直接 import 的二进制扩展模块（.pyd/.so）
- 使用 Nuitka 的 --module 模式
- 输出文件放到 utils/ 目录，名称为 xianyu_slider_stealth.<abi>.pyd/.so
- 这样 Python 将优先加载二进制扩展而不是同名 .py
"""

import sys
import subprocess
from pathlib import Path

SRC = Path("utils/xianyu_slider_stealth.py")
OUT_DIR = Path("utils")


def ensure_nuitka():
    try:
        import nuitka  # noqa: F401
        print("✓ Nuitka 已安装")
        return True
    except Exception:
        print("✗ 未检测到 Nuitka。请先允许我安装: pip install nuitka ordered-set zstandard")
        return False


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable, "-m", "nuitka",
        "--module",
        "--output-dir=%s" % str(OUT_DIR),
        "--remove-output",
        "--assume-yes-for-downloads",
        "--show-progress",
        "--python-flag=no_docstrings",
        "--python-flag=no_warnings",
        "--enable-plugin=anti-bloat",
        # 降低内存占用，避免容器内 OOM
        "--lto=no",
        "--jobs=1",
        str(SRC)
    ]

    print("执行编译命令:\n ", " ".join(cmd))
    result = subprocess.run(cmd, text=True)
    if result.returncode != 0:
        print("✗ 编译失败 (Nuitka 返回非零)")
        return 1

    # 列出 utils 目录下的产物
    built = sorted(p for p in OUT_DIR.glob("xianyu_slider_stealth.*.pyd"))
    if not built:
        built = sorted(p for p in OUT_DIR.glob("xianyu_slider_stealth.*.so"))
    if not built:
        print("✗ 未找到编译产物。请检查输出日志。")
        return 2

    print("\n✓ 编译产物:")
    for p in built:
        print(" -", p)
    return 0


def main():
    if not SRC.exists():
        print(f"✗ 源文件不存在: {SRC}")
        return 1
    if not ensure_nuitka():
        return 2
    return build()


if __name__ == "__main__":
    raise SystemExit(main())

