import { Router } from "express";
import * as controller
  from "../controllers/sessaoController.ts";
import { autenticar } from "../middlewares/autenticar.ts";


const router = Router();


router.post("/", controller.create);
router.get("/atual", autenticar, controller.retrieveCurrent);
router.delete("/atual", controller.remove);


export default router;
