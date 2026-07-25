# miniIR grammar (BNF)

Generated from `miniIR.jj`, the JavaCC grammar shipped with assignment 3.
Non-terminals are written `<Name>`; terminals are quoted.
miniIR permits *nested* expressions; assignment 4 flattens it to microIR,
in which every operand must be a bare temporary or literal.

```
<Goal> ::= "MAIN" <StmtList> "END" ( <Procedure> )* <EOF>
<StmtList> ::= ( ( <Label> )? <Stmt> )*
<Procedure> ::= <Label> "[" <IntegerLiteral> "]" <StmtExp>
<Stmt> ::= <NoOpStmt> | <ErrorStmt> | <CJumpStmt> | <JumpStmt> | <HStoreStmt> | <HLoadStmt> | <MoveStmt> | <PrintStmt>
<NoOpStmt> ::= "NOOP"
<ErrorStmt> ::= "ERROR"
<CJumpStmt> ::= "CJUMP" <Exp> <Label>
<JumpStmt> ::= "JUMP" <Label>
<HStoreStmt> ::= "HSTORE" <Exp> <IntegerLiteral> <Exp>
<HLoadStmt> ::= "HLOAD" <Temp> <Exp> <IntegerLiteral>
<MoveStmt> ::= "MOVE" <Temp> <Exp>
<PrintStmt> ::= "PRINT" <Exp>
<Exp> ::= <StmtExp> | <Call> | <HAllocate> | <BinOp> | <Temp> | <IntegerLiteral> | <Label>
<StmtExp> ::= "BEGIN" <StmtList> "RETURN" <Exp> "END"
<Call> ::= "CALL" <Exp> "(" ( <Exp> )* ")"
<HAllocate> ::= "HALLOCATE" <Exp>
<BinOp> ::= <Operator> <Exp> <Exp>
<Operator> ::= "LE" | "NE" | "PLUS" | "MINUS" | "TIMES" | "DIV"
<Temp> ::= "TEMP" <IntegerLiteral>
<IntegerLiteral> ::= <INTEGER_LITERAL>
<Label> ::= <IDENTIFIER>
```
