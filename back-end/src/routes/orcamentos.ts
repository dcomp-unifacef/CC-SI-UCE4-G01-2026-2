import { Router } from "express";
import * as controller
  from "../controllers/orcamentoController.ts";

import { Perfil } from "../../generated/prisma/client.ts";

import { exigirPerfil } from "../middlewares/exigirPerfil.ts";


const router = Router();

const todos = exigirPerfil(Perfil.DONO, Perfil.SECRETARIA, Perfil.DENTISTA);
const clinicos = exigirPerfil(Perfil.DONO, Perfil.DENTISTA);


router.get("/", todos, controller.index);
router.get("/:id", todos, controller.retrieve);
router.get("/:id/historico", todos, controller.historico);
router.get("/:id/pdf", todos, controller.pdf);
router.post("/", clinicos, controller.create);
router.patch("/:id", clinicos, controller.updateCabecalho);
router.post("/:id/itens", clinicos, controller.addItem);
router.patch("/:id/itens/:itemId", clinicos, controller.updateItem);
router.delete("/:id/itens/:itemId", clinicos, controller.removeItem);
router.post("/:id/decisao", clinicos, controller.decidir);
router.post("/:id/correcao", clinicos, controller.corrigir);
router.post("/:id/reabertura", clinicos, controller.reabrir);


export default router;
