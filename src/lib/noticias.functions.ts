import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buscarPaginaNoticias } from "@/lib/noticias";

const categoriaSchema = z.enum([
  "todas",
  "seguranca-privada",
  "seguranca-patrimonial",
  "varejo",
  "tecnologia",
]);

export const carregarNoticias = createServerFn({ method: "GET" })
  .inputValidator(z.object({ categoria: categoriaSchema, pagina: z.number().int().min(0).max(7).default(0) }))
  .handler(({ data }) => buscarPaginaNoticias(data.categoria, data.pagina));
