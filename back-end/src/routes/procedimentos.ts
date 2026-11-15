import { Router } from "express";
import * as controller
  from "../controllers/procedimentoController.ts";

import { Perfil } from "../../generated/prisma/client.ts";

import { exigirPerfil } from "../middlewares/exigirPerfil.ts";


const router = Router();

const clinicos = exigirPerfil(Perfil.DONO, Perfil.DENTISTA);


router.get("/", clinicos, controller.index);
router.get("/:id", clinicos, controller.retrieve);
router.post("/", clinicos, controller.create);
router.patch("/:id", clinicos, controller.update);


export default router;
