const router=require('express').Router();const auth=require('../middleware/authMiddleware');const permission=require('../middleware/permissionMiddleware');const c=require('../controllers/issueControlRuleController');
router.use(auth);
router.get('/',permission('NSO Rules','View'),c.list);
// Per-question overview (question + checklist type + rule state). Keep before '/:id'.
router.get('/questions',permission('NSO Rules','View'),c.questions);
router.post('/',permission('NSO Rules','Add'),c.create);
router.put('/:id',permission('NSO Rules','Edit'),c.update);
// Activate / deactivate a single rule.
router.patch('/:id/status',permission('NSO Rules','Edit'),c.setStatus);
router.delete('/delete-all',permission('NSO Rules','Edit'),c.removeAll);
router.delete('/:id',permission('NSO Rules','Edit'),c.remove);
module.exports=router;
