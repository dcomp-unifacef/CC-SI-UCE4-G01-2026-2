import { Router } from "express";
import * as controller
  from "../controllers/consultaController.ts";

import { Perfil } from "../../generated/prisma/client.ts";

import { exigirPerfil } from "../middlewares/exigirPerfil.ts";


const router = Router();

const todos = exigirPerfil(Perfil.DONO, Perfil.SECRETARIA, Perfil.DENTISTA);
const gestao = exigirPerfil(Perfil.DONO, Perfil.SECRETARIA);


router.get("/", todos, controller.index);
router.get("/:id", todos, controller.retrieve);
router.get("/:id/historico", todos, controller.historico);
router.post("/", gestao, controller.create);
router.patch("/:id/status", todos, controller.updateStatus);
router.patch("/:id/horario", gestao, controller.updateHorario);


export default router;
