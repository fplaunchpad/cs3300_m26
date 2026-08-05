FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      flex \
      bison \
      libfl-dev \
      spim \
      openjdk-21-jdk \
      make \
      python3 \
      vim \
      neovim \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Match the host user so files created in a bind mount are not root-owned.
ARG UID=1000
ARG GID=1000

RUN groupadd -g "$GID" student 2>/dev/null || true \
 && useradd -m -u "$UID" -g "$GID" student 2>/dev/null || true

USER student
WORKDIR /workspace
CMD ["/bin/bash"]
