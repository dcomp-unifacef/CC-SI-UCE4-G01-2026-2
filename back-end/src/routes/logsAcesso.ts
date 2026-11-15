import { Router } from "express";
import * as controller
  from "../controllers/logAcessoController.ts";


const router = Router();


router.get("/", controller.index);


export default router;
