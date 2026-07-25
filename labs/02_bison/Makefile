# Build the bison demos (each demo is a .l scanner plus a .y grammar).
#
#   make demo1.exe        make            make clean
#
# The scanner library flex wants differs by platform: -ll on macOS, -lfl with
# GNU flex on Linux. Detect it rather than making students edit this file.

CC     ?= cc
FLEX   ?= flex
BISON  ?= bison
LEXLIB ?= $(shell test "$$(uname -s)" = Darwin && echo -ll || echo -lfl)

.PHONY: all clean
all: $(patsubst %.l,%.exe,$(wildcard demo*.l))

%.exe: %.l %.y
	$(FLEX) $<
	$(BISON) $(word 2,$^)
	$(CC) $*.tab.c -o $@ $(LEXLIB)
	rm -f lex.yy.c $*.tab.c

clean:
	rm -f lex.yy.c *.tab.c *.tab.h a.out *.exe *~
