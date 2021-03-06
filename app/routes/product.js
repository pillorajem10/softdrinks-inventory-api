const express = require('express');
const router = express.Router();

const { list, add, getById, updateById, deleteById, addQuantityOfProds } = require('../controllers/product');

router.get('/', list);
router.post('/', add);
router.get('/:id', getById);
router.put('/:id', updateById);
router.delete('/:id', deleteById);
router.post('/:id', addQuantityOfProds);

module.exports = router;
