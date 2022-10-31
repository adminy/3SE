import {styleTags, tags as t} from "@lezer/highlight"

export const javaHighlighting = styleTags({
  null: t.null,
    instanceof: t.operatorKeyword,
  this: t.self,
  "new super assert open to with void": t.keyword,
  "class interface extends implements enum": t.definitionKeyword,
  "module package import": t.moduleKeyword,
  "switch while for if else case default do break continue return try catch finally throw": t.controlKeyword,
  ["requires exports opens uses provides public private protected static transitive abstract final " +
   "strictfp synchronized native transient volatile throws"]: t.modifier,
  IntegerLiteral: t.integer,
  FloatLiteral: t.float,
  "StringLiteral TextBlock": t.string,
  CharacterLiteral: t.character,
  LineComment: t.lineComment,
  BlockComment: t.blockComment,
  BooleanLiteral: t.bool,
  PrimitiveType: t.standard(t.typeName),
  TypeName: t.typeName,
  Identifier: t.variableName,
  "MethodName/Identifier": t.function(t.variableName),
  Definition: t.definition(t.variableName),
  ArithOp: t.arithmeticOperator,
  LogicOp: t.logicOperator,
  BitOp: t.bitwiseOperator,
  CompareOp: t.compareOperator,
  AssignOp: t.definitionOperator,
  UpdateOp: t.updateOperator,
  Asterisk: t.punctuation,
  Label: t.labelName,
  "( )": t.paren,
  "[ ]": t.squareBracket,
  "{ }": t.brace,
  ".": t.derefOperator,
  ", ;": t.separator
})