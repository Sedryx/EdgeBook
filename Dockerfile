# syntax=docker/dockerfile:1

FROM node:22-bookworm AS builder

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    file \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libssl-dev \
    libwebkit2gtk-4.1-dev \
    patchelf \
    pkg-config \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run test

# Produces Linux desktop bundles under src-tauri/target/release/bundle.
RUN npm run desktop:build
