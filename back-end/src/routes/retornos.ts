import { Router } from "express";
import * as controller
  from "../controllers/retornoController.ts";

import { Perfil } from "../../generated/prisma/client.ts";

import { exigirPerfil } from "../middlewares/exigirPerfil.ts";


const router = Router();

const todos = exigirPerfil(Perfil.DONO, Perfil.SECRETARIA, Perfil.DENTISTA);
const clinicos = exigirPerfil(Perfil.DONO, Perfil.DENTISTA);
const somenteDono = exigirPerfil(Perfil.DONO);


router.get("/", todos, controller.index);
router.get("/atrasos", todos, controller.atrasos);
router.get("/:id", todos, controller.retrieve);
router.get("/:id/historico", todos, controller.historico);
router.post("/", clinicos, controller.create);
router.patch("/:id/data", clinicos, controller.updateData);
router.post("/:id/descarte", somenteDono, controller.descartar);


export default router;
