---
layout: page
title: MiniJava grammar
permalink: /grammar/minijava/
---

# MiniJava grammar (BNF)

Generated from `minijava.jj`, the JavaCC grammar shipped with the
assignment kits, so it matches the parser your code is built on.
Non-terminals are written `<Name>`; terminals are quoted.

The grammar file itself is [minijava.jj](minijava.jj).

```
<Goal> ::= <MainClass> ( <TypeDeclaration> )* <EOF>
<MainClass> ::= "class" <Identifier> "{" "public" "static" "void" "main" "(" "String" "[" "]" <Identifier> ")" "{" <PrintStatement> "}" "}"
<TypeDeclaration> ::= <ClassDeclaration> | <ClassExtendsDeclaration>
<ClassDeclaration> ::= "class" <Identifier> "{" ( <VarDeclaration> )* ( <MethodDeclaration> )* "}"
<ClassExtendsDeclaration> ::= "class" <Identifier> "extends" <Identifier> "{" ( <VarDeclaration> )* ( <MethodDeclaration> )* "}"
<VarDeclaration> ::= <Type> <Identifier> ";"
<MethodDeclaration> ::= "public" <Type> <Identifier> "(" ( <FormalParameterList> )? ")" "{" ( <VarDeclaration> )* ( <Statement> )* "return" <Expression> ";" "}"
<FormalParameterList> ::= <FormalParameter> ( <FormalParameterRest> )*
<FormalParameter> ::= <Type> <Identifier>
<FormalParameterRest> ::= "," <FormalParameter>
<Type> ::= <ArrayType> | <BooleanType> | <IntegerType> | <Identifier>
<ArrayType> ::= "int" "[" "]"
<BooleanType> ::= "boolean"
<IntegerType> ::= "int"
<Statement> ::= <Block> | <AssignmentStatement> | <ArrayAssignmentStatement> | <IfStatement> | <WhileStatement> | <PrintStatement>
<Block> ::= "{" ( <Statement> )* "}"
<AssignmentStatement> ::= <Identifier> "=" <Expression> ";"
<ArrayAssignmentStatement> ::= <Identifier> "[" <Expression> "]" "=" <Expression> ";"
<IfStatement> ::= <IfthenElseStatement> | <IfthenStatement>
<IfthenStatement> ::= "if" "(" <Expression> ")" <Statement>
<IfthenElseStatement> ::= "if" "(" <Expression> ")" <Statement> "else" <Statement>
<WhileStatement> ::= "while" "(" <Expression> ")" <Statement>
<PrintStatement> ::= "System.out.println" "(" <Expression> ")" ";"
<Expression> ::= <OrExpression> | <AndExpression> | <CompareExpression> | <neqExpression> | <PlusExpression> | <MinusExpression> | <TimesExpression> | <DivExpression> | <ArrayLookup> | <ArrayLength> | <MessageSend> | <PrimaryExpression>
<AndExpression> ::= <PrimaryExpression> "&&" <PrimaryExpression>
<OrExpression> ::= <PrimaryExpression> "||" <PrimaryExpression>
<CompareExpression> ::= <PrimaryExpression> "<=" <PrimaryExpression>
<neqExpression> ::= <PrimaryExpression> "!=" <PrimaryExpression>
<PlusExpression> ::= <PrimaryExpression> "+" <PrimaryExpression>
<MinusExpression> ::= <PrimaryExpression> "-" <PrimaryExpression>
<TimesExpression> ::= <PrimaryExpression> "*" <PrimaryExpression>
<DivExpression> ::= <PrimaryExpression> "/" <PrimaryExpression>
<ArrayLookup> ::= <PrimaryExpression> "[" <PrimaryExpression> "]"
<ArrayLength> ::= <PrimaryExpression> "." "length"
<MessageSend> ::= <PrimaryExpression> "." <Identifier> "(" ( <ExpressionList> )? ")"
<ExpressionList> ::= <Expression> ( <ExpressionRest> )*
<ExpressionRest> ::= "," <Expression>
<PrimaryExpression> ::= <IntegerLiteral> | <TrueLiteral> | <FalseLiteral> | <Identifier> | <ThisExpression> | <ArrayAllocationExpression> | <AllocationExpression> | <NotExpression> | <BracketExpression>
<IntegerLiteral> ::= <INTEGER_LITERAL>
<TrueLiteral> ::= "true"
<FalseLiteral> ::= "false"
<Identifier> ::= <IDENTIFIER>
<ThisExpression> ::= "this"
<ArrayAllocationExpression> ::= "new" "int" "[" <Expression> "]"
<AllocationExpression> ::= "new" <Identifier> "(" ")"
<NotExpression> ::= "!" <Expression>
<BracketExpression> ::= "(" <Expression> ")"
<IdentifierList> ::= <Identifier> ( <IdentifierRest> )*
<IdentifierRest> ::= "," <Identifier>
```
