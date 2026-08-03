FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    wget \
    curl \
    vim \
    neovim \
    flex \
    bison \
    ant \
    make \
    javacc \
    openjdk-11-jdk \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --set java /usr/lib/jvm/java-11-openjdk-amd64/bin/java && \
    update-alternatives --set javac /usr/lib/jvm/java-11-openjdk-amd64/bin/javac

WORKDIR /workspace

RUN wget -q http://compilers.cs.ucla.edu/jtb/Files/jtb132.jar -O /usr/local/lib/jtb132.jar

RUN echo '#!/bin/bash\njava -jar /usr/local/lib/jtb132.jar "$@"' > /usr/local/bin/jtb \
    && chmod +x /usr/local/bin/jtb

CMD ["/bin/bash"]
