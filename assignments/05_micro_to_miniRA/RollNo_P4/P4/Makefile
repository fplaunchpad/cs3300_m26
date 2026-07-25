# Build this assignment.
#
#   make                     compile (same as: javac P<N>.java)
#   make run FILE=<input>    compile, then run on an input file
#   make clean               remove .class files (required before submitting)
#
# The main class is taken from this directory's name, so the same Makefile
# works for every assignment in the series.

JAVAC ?= javac
JAVA  ?= java
MAIN  := $(notdir $(CURDIR))

SRCS := $(shell find . -name '*.java')

.PHONY: all run clean
all: $(MAIN).class

$(MAIN).class: $(SRCS)
	$(JAVAC) $(MAIN).java

run: all
	@test -n "$(FILE)" || { echo "usage: make run FILE=<input file>"; exit 1; }
	$(JAVA) $(MAIN) < $(FILE)

clean:
	find . -name '*.class' -delete
