# Build the flex demos.
#
#   make demo1.exe        make exercise1.exe        make clean
#
# The scanner library flex wants differs by platform: -ll on macOS, -lfl with
# GNU flex on Linux. Detect it rather than making students edit this file.

CC     ?= cc
FLEX   ?= flex
LEXLIB ?= $(shell test "$$(uname -s)" = Darwin && echo -ll || echo -lfl)

.PHONY: all clean
all: $(patsubst %.l,%.exe,$(wildcard demo*.l))

%.exe: %.l
	$(FLEX) $<
	$(CC) lex.yy.c -o $@ $(LEXLIB)
	rm -f lex.yy.c

clean:
	rm -f lex.yy.c a.out *.exe *~
