const express=require("express");
const multer=require("multer");
const path=require("path");
const auth=require("../middleware/authMiddleware");
const C=require("../controllers/collectionTrackingController");
const router=express.Router();
const upload=multer({dest:path.resolve(__dirname,"../uploads")});

router.use(auth,C.ensure);
router.get("/configs",C.configs);
router.put("/configs/:stage",C.saveConfig);
router.post("/products",C.create);
router.post("/products/bulk",upload.single("file"),C.bulk);
router.get("/products/export",C.export);
router.get("/products",C.list);
router.get("/products/:id",C.view);
router.put("/products/:id/stage",C.updateStage);
router.post("/products/:id/comments",C.comment);
router.post("/products/:id/requests",C.request);
router.delete("/products/:id",C.delete);
router.delete("/products",C.deleteAll);
router.get("/requests",C.requests);
router.put("/requests/:id",C.reviewRequest);
router.get("/insight",C.insight);
router.get("/permissions",C.permissions);
router.put("/permissions",C.savePermissions);

module.exports=router;
