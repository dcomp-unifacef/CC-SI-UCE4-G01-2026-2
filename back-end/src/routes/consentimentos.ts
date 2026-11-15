import { Router } from "express";
import * as controller
  from "../controllers/consentimentoController.ts";

import { Perfil } from "../../generated/prisma/client.ts";

import { exigirPerfil } from "../middlewares/exigirPerfil.ts";


const router = Router();

const todos = exigirPerfil(Perfil.DONO, Perfil.SECRETARIA, Perfil.DENTISTA);


router.get("/", todos, controller.index);
router.post("/", todos, controller.create);


export default router;
