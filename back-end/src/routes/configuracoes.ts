import { Router } from "express";
import * as controller
  from "../controllers/configuracaoController.ts";


const router = Router();


router.get("/", controller.retrieve);
router.patch("/", controller.update);


export default router;
