import { Router } from "express";
import * as controller
  from "../controllers/procedimentoController.ts";

import { Perfil } from "../../generated/prisma/client.ts";

import { exigirPerfil } from "../middlewares/exigirPerfil.ts";


const router = Router();

const clinicos = exigirPerfil(Perfil.DONO, Perfil.DENTISTA);
const todos = exigirPerfil(Perfil.DONO, Perfil.DENTISTA, Perfil.SECRETARIA);


router.get("/", todos, controller.index);
router.get("/:id", todos, controller.retrieve);
router.post("/", clinicos, controller.create);
router.patch("/:id", clinicos, controller.update);


export default router;
