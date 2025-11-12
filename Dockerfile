# syntax=docker/dockerfile:1

# Base stage with shared environment configuration
FROM python:3.11-slim-bookworm AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=Asia/Shanghai \
    DOCKER_ENV=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# Builder stage: install build tooling, Python deps and optional binary modules
FROM base AS builder

ENV CC=gcc \
    CXX=g++ \
    NUITKA_CACHE_DIR=/tmp/nuitka-cache

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        g++ \
        ccache \
        patchelf \
        curl \
        ca-certificates \
        && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN if [ -f "utils/xianyu_slider_stealth.py" ]; then \
        echo "===================================="; \
        echo "检测到 xianyu_slider_stealth.py"; \
        echo "开始编译为二进制模块..."; \
        echo "===================================="; \
        pip install --no-cache-dir nuitka ordered-set zstandard && \
        python build_binary_module.py; \
        BUILD_RESULT=$?; \
        if [ $BUILD_RESULT -eq 0 ]; then \
            echo "===================================="; \
            echo "✓ 二进制模块编译成功"; \
            echo "===================================="; \
            ls -lh utils/xianyu_slider_stealth.* 2>/dev/null || true; \
        else \
            echo "===================================="; \
            echo "✗ 二进制模块编译失败 (错误码: $BUILD_RESULT)"; \
            echo "将继续使用 Python 源代码版本"; \
            echo "===================================="; \
        fi; \
        pip uninstall -y nuitka ordered-set zstandard >/dev/null 2>&1 || true; \
        rm -rf /tmp/nuitka-cache utils/xianyu_slider_stealth.build utils/xianyu_slider_stealth.dist; \
    else \
        echo "===================================="; \
        echo "未检测到 xianyu_slider_stealth.py"; \
        echo "跳过二进制编译"; \
        echo "===================================="; \
    fi

# Runtime stage: only keep what is needed to run the app
FROM base AS runtime

LABEL maintainer="zhinianboke" \
      version="2.2.0" \
      description="闲鱼自动回复系统 - 企业级多用户版本，支持自动发货和免拼发货" \
      repository="https://github.com/zhinianboke/xianyu-auto-reply" \
      license="仅供学习使用，禁止商业用途" \
      author="zhinianboke" \
      build-date="" \
      vcs-ref=""

ENV NODE_PATH=/usr/lib/node_modules

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nodejs \
        npm \
        tzdata \
        curl \
        ca-certificates \
        # 图像处理依赖
        libjpeg-dev \
        libpng-dev \
        libfreetype6-dev \
        fonts-dejavu-core \
        fonts-liberation \
        # Playwright浏览器依赖
        libnss3 \
        libnspr4 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libgbm1 \
        libxss1 \
        libasound2 \
        libatspi2.0-0 \
        libgtk-3-0 \
        libgdk-pixbuf2.0-0 \
        libxcursor1 \
        libxi6 \
        libxrender1 \
        libxext6 \
        libx11-6 \
        libxft2 \
        libxinerama1 \
        libxtst6 \
        libappindicator3-1 \
        libx11-xcb1 \
        libxfixes3 \
        xdg-utils \
        chromium \
        # OpenCV运行时依赖
        libgl1 \
        libglib2.0-0 \
        && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN node --version && npm --version

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app /app
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin"

RUN playwright install chromium && \
    playwright install-deps chromium

RUN mkdir -p /app/logs /app/data /app/backups /app/static/uploads/images && \
    chmod 777 /app/logs /app/data /app/backups /app/static/uploads /app/static/uploads/images

RUN echo "ulimit -c 0" >> /etc/profile

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
