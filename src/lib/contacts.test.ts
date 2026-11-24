import {
  appendContactoExtra,
  buildContactOptions,
  normalizeValor,
  parseContactosExtra,
  removeContactoExtra,
  updateContactoExtra,
} from "./contacts";

describe("parseContactosExtra", () => {
  it("devuelve lista vacía para entradas inválidas", () => {
    expect(parseContactosExtra(undefined)).toEqual([]);
    expect(parseContactosExtra(null)).toEqual([]);
    expect(parseContactosExtra("no-array")).toEqual([]);
    expect(parseContactosExtra([{ tipo: "OTRO", valor: "x" }])).toEqual([]);
    expect(parseContactosExtra([{ tipo: "EMAIL", valor: "   " }])).toEqual([]);
  });

  it("recorta valores y conserva entradas válidas", () => {
    expect(
      parseContactosExtra([
        { tipo: "EMAIL", valor: "  a@b.com " },
        { tipo: "PHONE", valor: " 0412-1234567 " },
        { tipo: "EMAIL", valor: "" },
      ])
    ).toEqual([
      { tipo: "EMAIL", valor: "a@b.com" },
      { tipo: "PHONE", valor: "0412-1234567" },
    ]);
  });
});

describe("updateContactoExtra", () => {
  const inicial = [
    { tipo: "EMAIL" as const, valor: "old@x.com" },
    { tipo: "PHONE" as const, valor: "+584121234567" },
  ];

  it("reemplaza el correo indicado", () => {
    const nueva = updateContactoExtra(inicial, "EMAIL", "old@x.com", "new@x.com");
    expect(nueva).toEqual([
      { tipo: "EMAIL", valor: "new@x.com" },
      { tipo: "PHONE", valor: "+584121234567" },
    ]);
  });

  it("normaliza el teléfono nuevo al formato de envío", () => {
    const nueva = updateContactoExtra(inicial, "PHONE", "+584121234567", "0412-9998877");
    expect(nueva[1]).toEqual({ tipo: "PHONE", valor: "+584129998877" });
  });

  it("encuentra el teléfono aunque se pase en otro formato", () => {
    const nueva = updateContactoExtra(inicial, "PHONE", "0412-1234567", "0412-0001122");
    expect(nueva[1]).toEqual({ tipo: "PHONE", valor: "+584120001122" });
  });

  it("devuelve la lista sin cambios si el nuevo valor ya existe", () => {
    const conDuplicado = [...inicial, { tipo: "EMAIL" as const, valor: "other@x.com" }];
    const nueva = updateContactoExtra(conDuplicado, "EMAIL", "old@x.com", "other@x.com");
    expect(nueva).toEqual(conDuplicado);
  });

  it("devuelve la lista sin cambios si el contacto no existe", () => {
    const nueva = updateContactoExtra(inicial, "EMAIL", "no@existe.com", "nuevo@x.com");
    expect(nueva).toEqual(inicial);
  });

  it("no toca contactos de otro tipo", () => {
    const nueva = updateContactoExtra(inicial, "EMAIL", "phone-valor", "a@b.com");
    expect(nueva).toEqual(inicial);
  });
});

describe("removeContactoExtra", () => {
  const inicial = [
    { tipo: "EMAIL" as const, valor: "a@x.com" },
    { tipo: "EMAIL" as const, valor: "b@x.com" },
    { tipo: "PHONE" as const, valor: "+584121234567" },
  ];

  it("elimina el correo indicado", () => {
    expect(removeContactoExtra(inicial, "EMAIL", "a@x.com")).toEqual([
      { tipo: "EMAIL", valor: "b@x.com" },
      { tipo: "PHONE", valor: "+584121234567" },
    ]);
  });

  it("elimina el teléfono aunque se pase en otro formato", () => {
    expect(removeContactoExtra(inicial, "PHONE", "0412-1234567")).toEqual([
      { tipo: "EMAIL", valor: "a@x.com" },
      { tipo: "EMAIL", valor: "b@x.com" },
    ]);
  });

  it("devuelve la lista sin cambios si no encuentra el contacto", () => {
    expect(removeContactoExtra(inicial, "EMAIL", "otra@x.com")).toEqual(inicial);
    expect(removeContactoExtra([], "EMAIL", "a@x.com")).toEqual([]);
  });

  it("no elimina contactos de otro tipo con el mismo valor", () => {
    const mixta = [
      { tipo: "EMAIL" as const, valor: "x" },
      { tipo: "PHONE" as const, valor: "x" },
    ];
    expect(removeContactoExtra(mixta, "EMAIL", "x")).toEqual([
      { tipo: "PHONE", valor: "x" },
    ]);
  });
});

describe("buildContactOptions", () => {
  it("incluye el nombre en las opciones base", () => {
    const ops = buildContactOptions(
      [
        { valor: "principal@x.com", fuente: "principal", nombre: "Empresa XYZ" },
        { valor: "contacto@x.com", fuente: "contacto", nombre: "Pedro Pérez" },
        { valor: null, fuente: "cobranza", nombre: "María López" },
        { valor: "   ", fuente: "cobranza", nombre: "Sin valor" },
      ],
      "EMAIL",
      []
    );
    expect(ops).toEqual([
      { valor: "principal@x.com", fuente: "principal", nombre: "Empresa XYZ" },
      { valor: "contacto@x.com", fuente: "contacto", nombre: "Pedro Pérez" },
    ]);
  });

  it("deduplica conservando el nombre de la primera ocurrencia", () => {
    const ops = buildContactOptions(
      [
        { valor: "a@x.com", fuente: "principal", nombre: "Cliente" },
        { valor: "A@X.com", fuente: "contacto", nombre: "Otra persona" },
      ],
      "EMAIL",
      []
    );
    expect(ops).toEqual([{ valor: "a@x.com", fuente: "principal", nombre: "Cliente" }]);
  });

  it("omite el nombre cuando viene vacío", () => {
    const ops = buildContactOptions([{ valor: "a@x.com", fuente: "principal", nombre: "  " }], "EMAIL", []);
    expect(ops).toEqual([{ valor: "a@x.com", fuente: "principal" }]);
  });

  it("no agrega nombre a los contactos extra", () => {
    const ops = buildContactOptions([], "PHONE", [{ tipo: "PHONE", valor: "0412-1234567" }]);
    expect(ops).toEqual([{ valor: "0412-1234567", fuente: "extra" }]);
  });
});

describe("appendContactoExtra + updateContactoExtra integrados", () => {
  it("permite editar un contacto recién agregado y eliminarlo después", () => {
    let lista = appendContactoExtra([], "PHONE", "0412-1234567");
    expect(lista).toEqual([{ tipo: "PHONE", valor: "+584121234567" }]);

    lista = updateContactoExtra(lista, "PHONE", "0412-1234567", "0414-7654321");
    expect(lista).toEqual([{ tipo: "PHONE", valor: "+584147654321" }]);
    expect(normalizeValor(lista[0].valor, "PHONE")).toBe("584147654321");

    lista = removeContactoExtra(lista, "PHONE", "0414-7654321");
    expect(lista).toEqual([]);
  });
});
