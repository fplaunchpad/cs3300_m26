/-
  DANGLING ELSE: THE REWRITTEN GRAMMAR GENERATES THE SAME LANGUAGE
  ===============================================================

  Slide "Did the rewrite lose anything?" in 03_parsing.pdf claims that the two
  dangling-else grammars generate the same language, and that although grammar
  equivalence is undecidable in general, this particular instance can be proved.
  This file is that proof, checked by machine.

  The ambiguous grammar, as it appears on the slides:

      stmt ::= if E then stmt
             | if E then stmt else stmt
             | other

  and the rewrite that forces every `else` to bind to the nearest unmatched
  `then`, by splitting statements into matched (M) and unmatched (U) ones:

      stmt ::= M | U
      M    ::= if E then M else M
             | other
      U    ::= if E then stmt
             | if E then M else U

  M is a statement in which every `then` has its own `else`. U is one with at
  least one `then` that does not.

  WHAT IS PROVED.  `sameLanguage` at the bottom: a token string is derivable in
  the first grammar exactly when it is derivable in the second. Both directions
  are proved by building an actual derivation in the target grammar out of the
  derivation you were given, so the proof is a pair of translations rather than
  an appeal to any decision procedure.

  WHAT IS NOT PROVED.  That the second grammar is unambiguous. That is a
  separate statement (at most one parse tree per string), and it is not what the
  slide's "same language" question asks. Equal languages is the weaker property,
  and it is the one at risk when you rewrite a grammar: the rewrite could
  silently drop or add strings.

  HOW TO CHECK IT.  Lean 4, no Mathlib and no other dependency, so there is no
  project to set up:

      $ lean dangling_else_equivalence.lean

  Silence means every proof below was accepted. Any gap would be reported as an
  error, and `sorry` (Lean's "trust me") appears nowhere in this file, so there
  is nothing to take on faith.
-/

namespace DanglingElse

/-
  THE ALPHABET

  The terminals of both grammars. `if`, `then` and `else` are Lean keywords, so
  they are written in guillemets to be usable as constructor names; `.if` and
  friends still refer to them normally everywhere below.

  `expr` and `other` carry a natural number. Two occurrences of E in one string
  are usually different expressions in the source program, and the label records
  that, so the theorem is about strings that remember which expression sat
  where. Nothing in the proof inspects a label; they are carried through
  untouched.

  `DecidableEq` and `Repr` are conveniences for poking at tokens with `#eval`.
  The proof does not need them.
-/
inductive Token where
  | «if»
  | expr (name : Nat)
  | «then»
  | «else»
  | other (name : Nat)
  deriving DecidableEq, Repr

open Token

/-- A sentence is a list of terminals. Concatenation is `++`. -/
abbrev Word := List Token

-- The two right-hand-side shapes both grammars are built from, named once so
-- that the rules below read like the BNF and so that the two grammars are
-- literally talking about the same token strings.

def ifThen (e : Nat) (body : Word) : Word :=
  [.if, .expr e, .then] ++ body

def ifThenElse (e : Nat) (thenBranch elseBranch : Word) : Word :=
  [.if, .expr e, .then] ++ thenBranch ++ [.else] ++ elseBranch

/-
  THE AMBIGUOUS GRAMMAR

  A grammar is encoded as an inductive family indexed by the string it derives:
  `Old w` is the type whose values are the parse trees of `w` in this grammar.
  One constructor per production, and a constructor's arguments are the
  subtrees, exactly as a parse tree node has one child per symbol on the right
  of its production.

  So "w is in the language" becomes "the type `Old w` has at least one value",
  which is what `InOldLanguage` says at the bottom of the file. Derivations live
  in `Type` rather than `Prop` so that they are ordinary data: this is what would
  let you state ambiguity by exhibiting two distinct trees for one string.
-/
inductive Old : Word → Type where
  | other (name : Nat) : Old [.other name]
  | ifThen (e : Nat) {body : Word} :
      Old body → Old (DanglingElse.ifThen e body)
  | ifThenElse (e : Nat) {thenBranch elseBranch : Word} :
      Old thenBranch → Old elseBranch →
      Old (DanglingElse.ifThenElse e thenBranch elseBranch)

/-
  THE REWRITTEN GRAMMAR

  Three nonterminals now, so the family is indexed by which one sits at the
  root as well as by the string.
-/
inductive Nonterminal where
  | stmt
  | matched
  | unmatched

/-
  One constructor per production of the rewritten grammar:

    stmtMatched     stmt ::= M              a matched statement is a statement
    stmtUnmatched   stmt ::= U              so is an unmatched one
    other           M    ::= other
    matchedIf       M    ::= if E then M else M
    unmatchedIf     U    ::= if E then stmt
    unmatchedIfElse U    ::= if E then M else U

  The two restrictions in the M and U rules are the whole point of the rewrite.
  `matchedIf` demands a *matched* then-branch: were a U allowed there, you could
  derive `if E1 then (if E2 then S3) else S2`, which is precisely the tree that
  binds the `else` to the outer `if`, the reading the rewrite exists to forbid.
  `unmatchedIfElse` demands a matched then-branch for the same reason, and loses
  nothing, because a statement whose else-branch trails an unmatched `then` is
  itself unmatched and comes from `unmatchedIf` instead.
-/
inductive New : Nonterminal → Word → Type where
  | stmtMatched {word : Word} :
      New .matched word → New .stmt word
  | stmtUnmatched {word : Word} :
      New .unmatched word → New .stmt word
  | other (name : Nat) :
      New .matched [.other name]
  | matchedIf (e : Nat) {thenBranch elseBranch : Word} :
      New .matched thenBranch → New .matched elseBranch →
      New .matched (DanglingElse.ifThenElse e thenBranch elseBranch)
  | unmatchedIf (e : Nat) {body : Word} :
      New .stmt body → New .unmatched (DanglingElse.ifThen e body)
  | unmatchedIfElse (e : Nat) {thenBranch elseBranch : Word} :
      New .matched thenBranch → New .unmatched elseBranch →
      New .unmatched (DanglingElse.ifThenElse e thenBranch elseBranch)

abbrev Stmt := New .stmt
abbrev Matched := New .matched
abbrev Unmatched := New .unmatched

/--
  The height of a derivation tree. Used only to bound the recursion in
  `closeNearestAux` below; it plays no part in the statement being proved.
  Note every constructor adds one, so a height is always at least 1.
-/
def New.height {nonterminal : Nonterminal} {word : Word} :
    New nonterminal word → Nat
  | .stmtMatched h => h.height + 1
  | .stmtUnmatched h => h.height + 1
  | .other _ => 1
  | .matchedIf _ hThen hElse => max hThen.height hElse.height + 1
  | .unmatchedIf _ hBody => hBody.height + 1
  | .unmatchedIfElse _ hThen hElse => max hThen.height hElse.height + 1

/-
  DIRECTION 1 (the easy one): every string of the new grammar is a string of
  the old one.

  Structural induction on the derivation, one line per rule. Every production of
  the rewritten grammar is a production of the ambiguous one with the M/U
  distinction erased, so each case hands back the corresponding `Old`
  constructor and the string never changes. `stmtMatched` and `stmtUnmatched`
  are the injections of S ::= M | U and carry no tokens, so they simply vanish.

  This direction is where you see that the rewrite added nothing.

  (`noncomputable` throughout: the `induction` tactic elaborates to the
  recursor `New.rec`, and Lean's code generator will not compile a recursor for
  a family in `Type`. The terms only ever have to exist, since the theorem uses
  them through `Nonempty`, so there is nothing to run.)
-/
noncomputable def newToOld {nonterminal : Nonterminal} {word : Word}
    (h : New nonterminal word) : Old word := by
  induction h with
  | stmtMatched _ ih => exact ih
  | stmtUnmatched _ ih => exact ih
  | other name => exact Old.other name
  | matchedIf e _ _ ihThen ihElse =>
      exact Old.ifThenElse e ihThen ihElse
  | unmatchedIf e _ ih => exact Old.ifThen e ih
  | unmatchedIfElse e _ _ ihThen ihElse =>
      exact Old.ifThenElse e ihThen ihElse

/-
  THE REASSOCIATION STEP

  This is the one piece of real work in the file, and the reason the other
  direction is not just as short.

  Statement: if `left` is unmatched and `right` is a statement, then
  `left ++ else ++ right` is a statement. Being unmatched means `left` ends with
  a `then` that has no `else` of its own; the string above supplies one, and the
  `else` binds to that innermost dangling `then`. The job is to walk down to it
  and rebuild the derivation around it.

  Reading the cases:

  * `unmatchedIf e hBody`, so `left` is `if E then <body>`.
      - body matched: the dangling `then` is this one. Attach the `else` here.
        Which rule applies depends on `right`: a matched `right` gives
        `if E then M else M`, an unmatched one gives `if E then M else U`.
        No recursion, this is the base case.
      - body unmatched: the dangling `then` is deeper. Recurse into the body,
        then rewrap with `unmatchedIf`.
  * `unmatchedIfElse e hThen hElse`, so `left` is `if E then M else <hElse>`
    with `hElse` unmatched. The dangling `then` is inside `hElse`. Recurse
    there, then rebuild depending on whether the result came back matched or
    unmatched.

  About `fuel`: the recursive calls are on grandchildren, reached only after
  destructuring twice, and Lean's structural termination checker does not see
  the decrease. Rather than argue with it, the recursion counts down an explicit
  `fuel` and carries `enough`, a proof that the fuel still covers the height of
  the derivation. `closeNearest` starts it off with exactly the height. The
  `zero` case is impossible and is discharged that way: every derivation has
  height at least 1, so `enough` is contradictory there and `simp` closes it.

  About the `simpa [ifThen, ifThenElse, List.append_assoc]` calls: the tree that
  gets built and the tree that is wanted derive the very same token list, but
  `++` associates it differently on the two sides (`(A ++ B) ++ C` against
  `A ++ (B ++ C)`). Unfolding the two abbreviations and rebracketing is all
  those steps do.
-/
noncomputable def closeNearestAux (fuel : Nat) {left right : Word}
    (hLeft : Unmatched left) (hRight : Stmt right)
    (enough : hLeft.height ≤ fuel) :
    Stmt (left ++ [.else] ++ right) := by
  cases fuel with
  | zero =>
      cases hLeft <;> simp [New.height] at enough
  | succ fuel =>
      cases hLeft with
      | unmatchedIf e hBody =>
          cases hBody with
          | stmtMatched hMatched =>
              -- The nearest dangling `then` is this one; the `else` lands here.
              cases hRight with
              | stmtMatched hRightMatched =>
                  simpa [ifThen, ifThenElse, List.append_assoc] using
                    New.stmtMatched
                      (New.matchedIf e hMatched hRightMatched)
              | stmtUnmatched hRightUnmatched =>
                  simpa [ifThen, ifThenElse, List.append_assoc] using
                    New.stmtUnmatched
                      (New.unmatchedIfElse e hMatched hRightUnmatched)
          | stmtUnmatched hUnmatched =>
              -- Still deeper. Two constructors were peeled off, so the height
              -- dropped by two and one unit of fuel is more than enough.
              have smaller : hUnmatched.height ≤ fuel := by
                simp [New.height] at enough
                omega
              simpa [ifThen, List.append_assoc] using
                New.stmtUnmatched
                  (New.unmatchedIf e
                    (closeNearestAux fuel hUnmatched hRight smaller))
      | unmatchedIfElse e hThen hElse =>
          -- The then-branch is matched, so the dangling `then` is in the
          -- else-branch. Recurse there and rebuild this node around the result.
          have smaller : hElse.height ≤ fuel := by
            simp [New.height] at enough
            omega
          cases closeNearestAux fuel hElse hRight smaller with
          | stmtMatched hClosed =>
              simpa [ifThenElse, List.append_assoc] using
                New.stmtMatched (New.matchedIf e hThen hClosed)
          | stmtUnmatched hClosed =>
              simpa [ifThenElse, List.append_assoc] using
                New.stmtUnmatched (New.unmatchedIfElse e hThen hClosed)

/-- `closeNearestAux` with the fuel supplied: the height of the derivation
    always covers itself. -/
noncomputable def closeNearest {left right : Word}
    (hLeft : Unmatched left) (hRight : Stmt right) :
    Stmt (left ++ [.else] ++ right) :=
  closeNearestAux hLeft.height hLeft hRight (Nat.le_refl _)

/-
  DIRECTION 2 (the one that has content): every string of the old grammar is a
  string of the new one.

  Induction on the old derivation. `other` and `if E then S` go straight across.
  The `if E then S1 else S2` case splits on what the induction gave back for
  `S1`:

  * `S1` matched, `S2` matched   -> `matchedIf`, a matched statement.
  * `S1` matched, `S2` unmatched -> `unmatchedIfElse`, an unmatched statement.
  * `S1` UNMATCHED               -> no rule of the new grammar applies.

  That last case is worth dwelling on, because it is the whole content of the
  rewrite. There is deliberately no production `if E then U else ...`: it is
  exactly the parse that binds the `else` to the outer `if`, which is the tree
  being deleted. So it cannot be patched, and should not be.

  The string is still in the language, though, and it is derived a different
  way. `S1` is unmatched, so it ends in a `then` with no `else`; then
  `S1 else S2` is itself a statement by `closeNearest`, and the whole thing is
  an instance of `U ::= if E then stmt`. The same tokens, re-bracketed, with the
  `else` now bound to the inner `if`. That is the rewrite doing its job: not
  losing the string, just insisting on the other reading of it.
-/
noncomputable def oldToStmt {word : Word} (h : Old word) : Stmt word := by
  induction h with
  | other name => exact New.stmtMatched (New.other name)
  | ifThen e _ ih => exact New.stmtUnmatched (New.unmatchedIf e ih)
  | ifThenElse e _ _ ihThen ihElse =>
      cases ihThen with
      | stmtMatched hThen =>
          cases ihElse with
          | stmtMatched hElse =>
              exact New.stmtMatched (New.matchedIf e hThen hElse)
          | stmtUnmatched hElse =>
              exact New.stmtUnmatched (New.unmatchedIfElse e hThen hElse)
      | stmtUnmatched hThen =>
          -- The case with no matching production. Reassociate instead.
          simpa [ifThen, ifThenElse, List.append_assoc] using
            New.stmtUnmatched
              (New.unmatchedIf e (closeNearest hThen ihElse))

-- Membership in each language: some derivation exists. `Nonempty` forgets
-- which one, which is the right notion here, since the question is which
-- strings are generated and not how many trees each one has.

def InOldLanguage (word : Word) : Prop := Nonempty (Old word)

def InNewLanguage (word : Word) : Prop := Nonempty (Stmt word)

/--
  The two grammars generate the same language. Each direction unpacks a
  derivation, translates it, and packs the result back up.
-/
theorem sameLanguage (word : Word) :
    InOldLanguage word ↔ InNewLanguage word := by
  constructor
  · rintro ⟨h⟩
    exact ⟨oldToStmt h⟩
  · rintro ⟨h⟩
    exact ⟨newToOld h⟩

end DanglingElse
