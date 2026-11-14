import { Router } from "express";
import * as controller
  from "../controllers/usuarioController.ts";
import { autenticar } from "../middlewares/autenticar.ts";
import { exigirPerfil } from "../middlewares/exigirPerfil.ts";
import { Perfil } from "../../generated/prisma/client.ts";


const router = Router();

const somenteDono = exigirPerfil(Perfil.DONO);


router.use(autenticar);


router.patch("/atual/senha", controller.changeOwnPassword);

router.get("/", somenteDono, controller.retrieveAll);
router.get("/:id", somenteDono, controller.retrieveOne);
router.post("/", somenteDono, controller.create);
router.patch("/:id", somenteDono, controller.update);
router.patch("/:id/senha", somenteDono, controller.resetPassword);


export default router;
