import { describe, it, expect } from "vitest";
import {
  allocateCommonByArea,
  parseApartmentsCSV,
  apartmentsToCSV,
} from "../ApartmentListEditor.jsx";

/**
 * Sprint 16 Task 7 — Teste utilitare ApartmentListEditor
 */

describe("allocateCommonByArea — alocare pro-rata consum comun", () => {
  it("distribuie 100% proporțional cu Au", () => {
    const apartments = [
      { id: "1", areaUseful: "60" },
      { id: "2", areaUseful: "60" },
      { id: "3", areaUseful: "60" },
      { id: "4", areaUseful: "60" },
    ];
    const result = allocateCommonByArea(apartments);
    result.forEach((apt) => {
      expect(apt.allocatedCommonPct).toBe(25);
    });
  });

  it("alocă proporțional când suprafețele diferă", () => {
    const apartments = [
      { id: "1", areaUseful: "100" },
      { id: "2", areaUseful: "50" },
      { id: "3", areaUseful: "50" },
    ];
    const result = allocateCommonByArea(apartments);
    expect(result[0].allocatedCommonPct).toBe(50);
    expect(result[1].allocatedCommonPct).toBe(25);
    expect(result[2].allocatedCommonPct).toBe(25);
  });

  it("returnează lista neschimbată dacă total Au = 0", () => {
    const apartments = [{ id: "1", areaUseful: "0" }];
    const result = allocateCommonByArea(apartments);
    expect(result).toEqual(apartments);
  });

  it("gestionează listă goală", () => {
    expect(allocateCommonByArea([])).toEqual([]);
  });

  it("suma procentelor = 100% (±0.1% toleranță rotunjire)", () => {
    const apartments = [
      { id: "1", areaUseful: "58.5" },
      { id: "2", areaUseful: "64.2" },
      { id: "3", areaUseful: "72.8" },
      { id: "4", areaUseful: "45.0" },
    ];
    const result = allocateCommonByArea(apartments);
    const total = result.reduce((s, a) => s + a.allocatedCommonPct, 0);
    expect(Math.abs(total - 100)).toBeLessThan(0.1);
  });
});

describe("parseApartmentsCSV — import bulk CSV", () => {
  it("parsează CSV cu antet + 2 rânduri", () => {
    const csv = `numar,scara,etaj,Au,orientare,ocupanti,colt,ultim_etaj
1,A,P,58.5,N;E,3,true,false
2,A,1,64.2,S;V,2,false,false`;
    const result = parseApartmentsCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].number).toBe("1");
    expect(result[0].staircase).toBe("A");
    expect(result[0].areaUseful).toBe("58.5");
    expect(result[0].orientation).toEqual(["N", "E"]);
    expect(result[0].occupants).toBe(3);
    expect(result[0].corner).toBe(true);
    expect(result[0].groundFloor).toBe(true);
    expect(result[0].floor).toBe(0);
    expect(result[1].floor).toBe(1);
  });

  it("parsează CSV fără antet", () => {
    const csv = `1,A,P,58.5,N,3,true,false`;
    const result = parseApartmentsCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe("1");
  });

  it("acceptă punct-virgulă ca separator", () => {
    const csv = `numar;scara;etaj;Au;orientare;ocupanti;colt;ultim_etaj
1;A;1;60;N;2;false;false`;
    const result = parseApartmentsCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].areaUseful).toBe("60");
  });

  it("filtrează orientări invalide", () => {
    const csv = `1,A,1,60,XYZ;N,2,false,false`;
    const result = parseApartmentsCSV(csv);
    expect(result[0].orientation).toEqual(["N"]);
  });

  it("returnează array gol la CSV gol", () => {
    expect(parseApartmentsCSV("")).toEqual([]);
    expect(parseApartmentsCSV("   ")).toEqual([]);
  });

  it("folosește valori implicite pentru ocupanți lipsă", () => {
    const csv = `1,A,1,60,N,,false,false`;
    const result = parseApartmentsCSV(csv);
    expect(result[0].occupants).toBe(2); // default
  });

  it("acceptă 'true'/'da'/'1'/'yes' pentru colț/top", () => {
    ["true", "DA", "1", "yes", "Y"].forEach((v) => {
      const csv = `1,A,1,60,N,2,${v},false`;
      const result = parseApartmentsCSV(csv);
      expect(result[0].corner).toBe(true);
    });
  });
});

describe("apartmentsToCSV — export CSV", () => {
  it("exportă CSV valid cu antet", () => {
    const apartments = [
      {
        number: "1",
        staircase: "A",
        floor: 0,
        areaUseful: "58.5",
        orientation: ["N", "E"],
        occupants: 3,
        corner: true,
        topFloor: false,
      },
    ];
    const csv = apartmentsToCSV(apartments);
    expect(csv).toContain("numar,scara,etaj,Au,orientare,ocupanti,colt,ultim_etaj");
    expect(csv).toContain("1,A,0,58.5,N;E,3,true,false");
  });

  it("round-trip: export → import returnează aceeași structură", () => {
    const apartments = [
      {
        number: "3",
        staircase: "B",
        floor: 2,
        areaUseful: "75",
        orientation: ["S", "V"],
        occupants: 4,
        corner: false,
        topFloor: true,
      },
    ];
    const csv = apartmentsToCSV(apartments);
    const reparsed = parseApartmentsCSV(csv);
    expect(reparsed[0].number).toBe("3");
    expect(reparsed[0].staircase).toBe("B");
    expect(reparsed[0].floor).toBe(2);
    expect(reparsed[0].areaUseful).toBe("75");
    expect(reparsed[0].orientation).toEqual(["S", "V"]);
    expect(reparsed[0].topFloor).toBe(true);
  });

  it("gestionează array gol", () => {
    const csv = apartmentsToCSV([]);
    expect(csv).toBe("numar,scara,etaj,Au,orientare,ocupanti,colt,ultim_etaj");
  });
});
