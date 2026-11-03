import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buscarNoticias } from "@/lib/noticias";

const categoriaSchema = z.enum([
  "todas",
  "seguranca-privada",
  "seguranca-patrimonial",
  "varejo",
  "tecnologia",
]);

export const carregarNoticias = createServerFn({ method: "GET" })
  .validator((input: unknown) => categoriaSchema.parse(input))
  .handler(({ data }) => buscarNoticias(data));
