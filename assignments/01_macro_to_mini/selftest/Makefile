# Build the MacroJava -> MiniJava translator.
#
# bison and flex are taken from PATH (the old hardcoded
# /usr/local/Cellar/bison/3.8.2 path only existed on Intel Macs). The scanner
# must be compiled alongside the parser: A1.y declares yylex() but does not
# include lex.yy.c. The scanner library is -ll on macOS, -lfl on GNU/Linux.

CC     ?= cc
FLEX   ?= flex
BISON  ?= bison
LEXLIB ?= $(shell test "$$(uname -s)" = Darwin && echo -ll || echo -lfl)

A1.exe: A1.l A1.y
	$(BISON) -d A1.y
	$(FLEX) A1.l
	$(CC) A1.tab.c lex.yy.c $(LEXLIB) -o $@

clean:
	rm -f *~ *.c *.exe *.tab.h

.PHONY: clean
