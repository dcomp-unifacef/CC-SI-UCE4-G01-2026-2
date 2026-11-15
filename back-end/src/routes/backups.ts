import { Router } from "express";
import * as controller
  from "../controllers/backupController.ts";


const router = Router();


router.get("/", controller.index);
router.post("/", controller.create);
router.get("/aviso", controller.aviso);
router.post("/:id/visto", controller.visto);


export default router;
