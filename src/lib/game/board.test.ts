import { describe, expect, it } from "vitest";
import {
  aimHitFromKey,
  aimKeys,
  BOARD_ORDER,
  BOARD_R,
  boardKeyAt,
  boardKeyCenter,
  clockKeys,
  finishingKeys,
  polar,
} from "./board";

describe("boardKeyAt", () => {
  it("rozpoznaje środek, 25 i pudło poza polami punktowymi", () => {
    expect(boardKeyAt(100, 100)).toBe("D25");
    expect(boardKeyAt(100, 100 - 10)).toBe("25");
    expect(boardKeyAt(100, 100 - BOARD_R.numbers)).toBe("0");
    expect(boardKeyAt(0, 0)).toBeNull();
  });

  it("rozpoznaje pojedyncze, triple i double każdej liczby", () => {
    BOARD_ORDER.forEach((n, i) => {
      const at = (r: number) => boardKeyAt(...polar(r, i * 18));
      expect(at(30)).toBe(String(n));
      expect(at(54)).toBe(`T${n}`);
      expect(at(68)).toBe(String(n));
      expect(at(81)).toBe(`D${n}`);
    });
  });

  it("granica wycinków: 20 u góry, 1 po prawej, 5 po lewej", () => {
    expect(boardKeyAt(...polar(30, 8))).toBe("20");
    expect(boardKeyAt(...polar(30, 10))).toBe("1");
    expect(boardKeyAt(...polar(30, -10))).toBe("5");
    expect(boardKeyAt(...polar(30, 180))).toBe("3");
  });

  it("środek pola wraca jako to samo pole", () => {
    for (const key of ["20", "T19", "D16", "25", "D25", "T5", "D1"]) {
      const c = boardKeyCenter(key);
      expect(c).not.toBeNull();
      expect(boardKeyAt(...c!)).toBe(key);
    }
    expect(boardKeyCenter("0")).toBeNull();
    expect(boardKeyCenter("T25")).toBeNull();
  });
});

describe("finishingKeys", () => {
  it("podaje wszystkie pola kończące jedną rzutką", () => {
    expect(finishingKeys(20).sort()).toEqual(["20", "D10"].sort());
    expect(finishingKeys(60)).toEqual(["T20"]);
    expect(finishingKeys(18).sort()).toEqual(["18", "D9", "T6"].sort());
    expect(finishingKeys(50)).toEqual(["D25"]);
    expect(finishingKeys(25)).toEqual(["25"]);
    expect(finishingKeys(23)).toEqual([]);
    expect(finishingKeys(0)).toEqual([]);
  });
});

describe("treningi", () => {
  it("Celowanie: pola celu i zamiana kliknięcia na trafienie", () => {
    expect(aimKeys("20")).toEqual(["20", "D20", "T20"]);
    expect(aimKeys("25")).toEqual(["25", "D25"]);
    expect(aimHitFromKey("20", "T20")).toBe("T");
    expect(aimHitFromKey("20", "D20")).toBe("D");
    expect(aimHitFromKey("20", "20")).toBe("S");
    expect(aimHitFromKey("20", "T1")).toBe("0");
    expect(aimHitFromKey("20", "0")).toBe("0");
    expect(aimHitFromKey("25", "D25")).toBe("D");
    expect(aimHitFromKey("25", "25")).toBe("S");
    expect(aimHitFromKey("25", "T20")).toBe("0");
  });

  it("Dookoła tarczy: pola bieżącej liczby albo środek na koniec", () => {
    expect(clockKeys(7, 21)).toEqual(["7", "D7", "T7"]);
    expect(clockKeys(21, 21)).toEqual(["25", "D25"]);
  });
});
