// "Margaret" -> "Margaret’s", "James" -> "James’"
export const possessive = (name: string) =>
  `${name}${/s$/i.test(name) ? "’" : "’s"}`;
