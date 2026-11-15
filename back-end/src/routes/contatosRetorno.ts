import { Router } from "express";
import * as controller
  from "../controllers/contatoRetornoController.ts";

import { Perfil } from "../../generated/prisma/client.ts";

import { exigirPerfil } from "../middlewares/exigirPerfil.ts";


const router = Router();

const todos = exigirPerfil(Perfil.DONO, Perfil.SECRETARIA, Perfil.DENTISTA);
const registro = exigirPerfil(Perfil.DONO, Perfil.SECRETARIA);


router.get("/", todos, controller.index);
router.post("/", registro, controller.create);


export default router;
