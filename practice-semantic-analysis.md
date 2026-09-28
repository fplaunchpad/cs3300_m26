---
layout: page
title: Semantic analysis — practice variants
permalink: /practice/semantic-analysis/
---

[Back to the lecture 1–7 practice guide]({{ site.baseurl }}/practice/)

These original questions supplement **lecture 5**, where the Dragon Book does
not closely match the course's MiniJava rules. They adapt the type-rule and
language-extension style of earlier course questions, with new examples.
They are optional practice, not a graded assignment.

Use the [revised course type system]({{ site.baseurl }}/assets/miniJava-typesystem-cs3300.pdf).
For each answer, give a derivation or identify the failed premise. Use declared
(static) types for checking calls. Assume variables are initialized and classes
are declared; consider each candidate independently. The pair, conditional,
and access features below are explicit extensions to core MiniJava.

## 1. Environments and shadowing

Environment composition `A · B` gives bindings in `B` precedence.
Suppose a method in `Panel` has the following environments:

```text
fields(Panel) = [size : int, ready : boolean, data : int[]]
parameters   = [size : boolean, count : int]
locals       = [ready : int, buffer : int[]]
```

1. Construct the method environment using rule (21).
2. Determine which of these expressions type-check and give their types:
   `size && true`, `ready + count`, `data[ready]`, `buffer.length`, `!ready`.
3. Repeat for a variant in which the parameter `size` is renamed `enabled`.
   Which answers change? Identify the declaration selected at each use.

## 2. Subtyping at assignments and calls

Suppose `Bike extends Vehicle`, `CargoBike extends Bike`, and
`Bus extends Vehicle`. The declared types of `v`, `b`, `c`, and `s` are
`Vehicle`, `Bike`, `CargoBike`, and `Bus`, respectively.
A `Depot` has methods with these types:

```text
accept : (Vehicle) -> Vehicle
repair : (Bike) -> Bike
```

Let `d : Depot`.

1. Check `v = c;`, `b = v;`, `b = c;`, and `s = b;`.
2. Determine the type, or failed premise, of `d.accept(c)`, `d.repair(c)`,
   and `d.repair(s)`.
3. Check `b = d.accept(c);` and `b = d.repair(c);`.
   Does knowing that `c` refers to a `CargoBike` change a call's static return type?
4. As a separate variant, change `repair`'s declared return type to `CargoBike`.
   Recheck `c = d.repair(b);`, assuming the method body satisfies its declaration.

## 3. Overriding versus argument compatibility

Suppose `FastFactory extends Factory`, and `Factory` declares
`Vehicle make(Bike x)`. Use the hierarchy from question 2.
For each proposed declaration in `FastFactory`, decide whether its signature
is a valid override. Explain parameter and return checks separately.

```text
(a) Bike    make(Bike item)
(b) Vehicle make(Vehicle item)
(c) Bike    make(CargoBike item)
(d) Bus     make(Bike item)
(e) Vehicle make(Bike item, int count)
```

Then consider a method declared `Bike make(Bike item)` with each return
expression independently: `new CargoBike()`, `new Vehicle()`, and `item`.
Which bodies satisfy the return rule?

Finally, explain why passing a `CargoBike` to a parameter declared `Bike`
can be allowed even though changing an overriding parameter from `Bike` to
`CargoBike` is forbidden.

## 4. Extend the type system with pairs

Add pair types `(t1, t2)` and expressions `pair(e1, e2)`, `first(e)`, and
`second(e)`. A pair stores its two component types; projections select the
corresponding component. Do not assume any additional pair-subtyping rule.

1. Write inference rules for construction and both projections.
2. Let `q = pair(false, pair(new int[6], 12))`. Derive the types of
   `first(q)`, `first(second(q))`, and `second(second(q))`.
3. Determine whether `first(first(q))` and
   `first(second(q))[second(second(q))]` type-check. Separate static typing
   from possible run-time array errors.
4. In a variant, replace `12` by `true`. Which conclusions change?
5. Add `swap(e)`, which exchanges a pair's components. Give its type rule
   and derive the type of `swap(second(q))` for the original `q`.

## 5. Conditional expressions and common supertypes

Extend expressions with `test ? left : right`, as in lecture 5. The test
must have type `boolean`; the result is the least upper bound of the branch
types. For class types this is the least common ancestor, if one exists.
Use only the declared inheritance relations: do not assume an implicit
universal `Object` class.

```text
Car extends Vehicle
Van extends Vehicle
ElectricCar extends Car
```

Let `flag : boolean`, `car : Car`, `van : Van`, and `ev : ElectricCar`.

1. Find the types of `flag ? ev : car` and `flag ? car : van`.
2. Check `car = flag ? ev : car;` and `car = flag ? car : van;`.
3. Check `flag ? 3 : 8`, `flag ? 3 : false`, and `3 ? car : ev`.
4. Add a separate root class `Building`. Explain why
   `flag ? new Vehicle() : new Building()` has no type under these rules.
5. Write the conditional's inference rule. Explain why choosing a branch's
   type arbitrarily, or using the assignment target's type as the answer,
   does not give a general expression-typing rule.

## 6. Access checks and inherited methods

Use the lecture's **simplified access model**, not the full Java access rules.
Let `Child extends Parent` and `Grandchild extends Child`.
`Parent` declares a protected method `int count()`; neither descendant
overrides it. All ordinary method-call typing premises hold.

A proposed check permits a protected call when `C ≤ D`, where `C` is the
class containing the call and `D` is the receiver's static type.

1. Consider a call on a receiver of type `Child` from a method in `Parent`.
   What does the proposed check conclude? Why is the declaring class relevant?
2. Introduce `methodowner(D, name)` and write a corrected protected-access
   premise for this simplified model.
3. Apply your premise to callers `Parent`, `Grandchild`, and an unrelated
   class `Visitor`, each using a receiver of static type `Child`.
4. If `count` were private instead, formulate the corresponding owner-based
   premise and recheck the three callers. Treat this as an extension in which
   lookup returns the declaration before the access test is performed.
