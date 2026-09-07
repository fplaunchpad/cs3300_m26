---
layout: page
title: MiniJava grammar (assignment 3)
permalink: /grammar/minijava-p2/
---

# MiniJava grammar (BNF) - assignment 3

Generated from `minijava-p2.jj`, the JavaCC grammar shipped with the
assignment 3 kit, so it matches the parser your code is built on.
Non-terminals are written `<Name>`; terminals are quoted.

This revision restructures the expression grammar so that `!` binds to
its operand: `!a && b` parses as `(!a) && b`.

The grammar file itself is [minijava-p2.jj]({{ '/assets/minijava-p2.jj' | relative_url }}).

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
<Expression> ::= <OrExpression> | <AndExpression> | <CompareExpression> | <neqExpression> | <PlusExpression> | <MinusExpression> | <TimesExpression> | <DivExpression> | <NotExpression> | <PostfixExpression>
<AndExpression> ::= <UnaryExpression> "&&" <UnaryExpression>
<OrExpression> ::= <UnaryExpression> "||" <UnaryExpression>
<CompareExpression> ::= <UnaryExpression> "<=" <UnaryExpression>
<neqExpression> ::= <UnaryExpression> "!=" <UnaryExpression>
<PlusExpression> ::= <UnaryExpression> "+" <UnaryExpression>
<MinusExpression> ::= <UnaryExpression> "-" <UnaryExpression>
<TimesExpression> ::= <UnaryExpression> "*" <UnaryExpression>
<DivExpression> ::= <UnaryExpression> "/" <UnaryExpression>
<ArrayLookup> ::= <PrimaryExpression> "[" <UnaryExpression> "]"
<ArrayLength> ::= <PrimaryExpression> "." "length"
<MessageSend> ::= <PrimaryExpression> "." <Identifier> "(" ( <ExpressionList> )? ")"
<ExpressionList> ::= <Expression> ( <ExpressionRest> )*
<ExpressionRest> ::= "," <Expression>
<UnaryExpression> ::= <PrimaryExpression> | <NotExpression>
<PostfixExpression> ::= <ArrayLookup> | <ArrayLength> | <MessageSend> | <PrimaryExpression>
<PrimaryExpression> ::= <IntegerLiteral> | <TrueLiteral> | <FalseLiteral> | <Identifier> | <ThisExpression> | <ArrayAllocationExpression> | <AllocationExpression> | <BracketExpression>
<IntegerLiteral> ::= <INTEGER_LITERAL>
<TrueLiteral> ::= "true"
<FalseLiteral> ::= "false"
<Identifier> ::= <IDENTIFIER>
<ThisExpression> ::= "this"
<ArrayAllocationExpression> ::= "new" "int" "[" <Expression> "]"
<AllocationExpression> ::= "new" <Identifier> "(" ")"
<NotExpression> ::= "!" ( <PostfixExpression> | <NotExpression> )
<BracketExpression> ::= "(" <Expression> ")"
<IdentifierList> ::= <Identifier> ( <IdentifierRest> )*
<IdentifierRest> ::= "," <Identifier>
```
