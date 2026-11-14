import { Router } from "express";
import * as controller
  from "../controllers/historicoVisitaController.ts";


const router = Router();


router.get("/", controller.retrieveAll);
router.get("/:id", controller.retrieveOne);
router.post("/", controller.create);
router.post("/antigos", controller.createAntigo);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);


export default router;
