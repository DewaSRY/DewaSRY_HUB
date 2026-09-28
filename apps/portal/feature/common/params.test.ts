import { describe, expect, it } from "vitest";
import { parseArrayParam, parseIntParam, parsePageParam, parseStringParam } from "./params";

describe("params", () => {
  it("parses positive integers only", () => {
    expect(parseIntParam("3", 1)).toBe(3);
    expect(parseIntParam(["4", "5"], 1)).toBe(4);
    expect(parseIntParam("0", 1)).toBe(1);
    expect(parseIntParam("-2", 1)).toBe(1);
    expect(parseIntParam("2abc", 1)).toBe(1);
    expect(parseIntParam(undefined, 7)).toBe(7);
    expect(parseIntParam("99999999999999999999", 1)).toBe(1);
  });

  it("parses page params", () => {
    expect(parsePageParam({ page: "2" })).toBe(2);
    expect(parsePageParam({})).toBe(1);
    expect(parsePageParam(undefined)).toBe(1);
  });

  it("parses strings and arrays", () => {
    expect(parseStringParam(["a", "b"])).toBe("a,b");
    expect(parseArrayParam("PAID,FAILED")).toEqual(["PAID", "FAILED"]);
    expect(parseArrayParam(["PAID", ""])).toEqual(["PAID"]);
  });
});
