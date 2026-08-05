/-
  The two dangling-else grammars from 03_parsing.tex generate the same
  language.  Expressions and `other` statements carry natural-number labels
  so that distinct occurrences can be distinguished in terminal strings.
-/

namespace DanglingElse

inductive Token where
  | «if»
  | expr (name : Nat)
  | «then»
  | «else»
  | other (name : Nat)
  deriving DecidableEq, Repr

open Token

abbrev Word := List Token

def ifThen (e : Nat) (body : Word) : Word :=
  [.if, .expr e, .then] ++ body

def ifThenElse (e : Nat) (thenBranch elseBranch : Word) : Word :=
  [.if, .expr e, .then] ++ thenBranch ++ [.else] ++ elseBranch

/- The compact, ambiguous grammar. -/
inductive Old : Word → Type where
  | other (name : Nat) : Old [.other name]
  | ifThen (e : Nat) {body : Word} :
      Old body → Old (DanglingElse.ifThen e body)
  | ifThenElse (e : Nat) {thenBranch elseBranch : Word} :
      Old thenBranch → Old elseBranch →
      Old (DanglingElse.ifThenElse e thenBranch elseBranch)

/- The rewritten grammar, indexed by its three nonterminals. -/
inductive Nonterminal where
  | stmt
  | matched
  | unmatched

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

def New.height {nonterminal : Nonterminal} {word : Word} :
    New nonterminal word → Nat
  | .stmtMatched h => h.height + 1
  | .stmtUnmatched h => h.height + 1
  | .other _ => 1
  | .matchedIf _ hThen hElse => max hThen.height hElse.height + 1
  | .unmatchedIf _ hBody => hBody.height + 1
  | .unmatchedIfElse _ hThen hElse => max hThen.height hElse.height + 1

/- Every parse in the rewritten grammar is also a parse in the old grammar. -/
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
  Attach an `else` branch to the closest unmatched `if`.  This is the
  reassociation step needed when an old derivation attached that `else` to an
  outer conditional.
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
              have smaller : hUnmatched.height ≤ fuel := by
                simp [New.height] at enough
                omega
              simpa [ifThen, List.append_assoc] using
                New.stmtUnmatched
                  (New.unmatchedIf e
                    (closeNearestAux fuel hUnmatched hRight smaller))
      | unmatchedIfElse e hThen hElse =>
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

noncomputable def closeNearest {left right : Word}
    (hLeft : Unmatched left) (hRight : Stmt right) :
    Stmt (left ++ [.else] ++ right) :=
  closeNearestAux hLeft.height hLeft hRight (Nat.le_refl _)

/- Every old parse has a parse using the rewritten grammar. -/
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
          simpa [ifThen, ifThenElse, List.append_assoc] using
            New.stmtUnmatched
              (New.unmatchedIf e (closeNearest hThen ihElse))

def InOldLanguage (word : Word) : Prop := Nonempty (Old word)

def InNewLanguage (word : Word) : Prop := Nonempty (Stmt word)

theorem sameLanguage (word : Word) :
    InOldLanguage word ↔ InNewLanguage word := by
  constructor
  · rintro ⟨h⟩
    exact ⟨oldToStmt h⟩
  · rintro ⟨h⟩
    exact ⟨newToOld h⟩

end DanglingElse
