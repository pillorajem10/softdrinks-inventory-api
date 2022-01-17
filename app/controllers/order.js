const Order = require('../models/Order.js');
const OrderItem = require('../models/OrderItem.js');
const Product = require('../models/Product.js');

const { sendError, sendSuccess, convertMomentWithFormat } = require ('../utils/methods');

//LIST ALL ORDERS
exports.list = (req, res, next) => {
    const { pageIndex, pageSize, sort_by, sort_direction } = req.query;

    console.log("REQ QUERYY", req.query)

    const page = pageIndex;
    const limit = pageSize;
    const sortDirection = sort_direction ? sort_direction.toLowerCase() : undefined;

    let sortPageLimit = {
      page,
      limit
    };

    if (sort_by && sortDirection) {
      sortPageLimit = {
        sort: { [sort_by] : sortDirection },
        page,
        limit,
      };
    }

    const orderFieldsFilter = {
      stock: req.query.minimumStock && req.query.maximumStock ? { $gte: +req.query.minimumStock, $lte: +req.query.maximumStock } : undefined,
      monthOrdered: req.query.monthOrdered ? +req.query.monthOrdered : undefined,
      dateOrdered: req.query.dateOrdered ? +req.query.dateOrdered : undefined,
      yearOrdered: req.query.yearOrdered ? +req.query.yearOrdered : undefined,
      $text: req.query.name ? { $search: req.query.name } : undefined,
    };

    // Will remove a key if that key is undefined
    Object.keys(orderFieldsFilter).forEach(key => orderFieldsFilter[key] === undefined && delete orderFieldsFilter[key]);

    const filterOptions = [
      { $match: orderFieldsFilter },
    ];

    const aggregateQuery = Order.aggregate(filterOptions);

    Order.aggregatePaginate(aggregateQuery,
      sortPageLimit,
      (err, result) => {
      if (err) {
        console.log("ERRoRRRRRRRRRRRRRRRRR", err)
        return sendError(res, err, 'Server Failed');
      } else {
        return sendSuccess(res, result);
      }
    });
};









//CREATE ORDER
exports.add = (req, res, next) => {
  Order.create(req.body, function (err, order) {
    if (err) {
      return sendError(res, err, 'Add order failed')
    } else {
      const convertedDate = convertMomentWithFormat(order.createdAt);
      const month = +convertedDate.split('/')[0];
      const date = +convertedDate.split('/')[1];
      const year = +convertedDate.split('/')[2];

      order.monthOrdered = month;
      order.dateOrdered = date;
      order.yearOrdered = year;

      order.credit = 'false';

      order.save();

      return sendSuccess(res, order)
    }
  });
}






//GET BY ID
exports.getById = (req, res, next) => {
  Order.findById(req.params.id, function (err, order) {
    if (err || !order) {
      return sendError(res, err, 'Cannot get order')
    } else {
      return sendSuccess(res, order)
    }
  });
}






//UPDATE BY ID
exports.updateById = (req, res, next) => {
  Order.findByIdAndUpdate(req.params.id, req.body, { new: true }, function (err, order) {
    if (err || !order) {
      return sendError(res, err, 'Cannot update order')
    } else {
      return sendSuccess(res, order)
    }
  });
}






//DELETE BY ID
exports.deleteById = (req, res, next) => {
  Order.findByIdAndRemove(req.params.id, req.body, function (err, order) {
    if (err || !order) {
      return sendError(res, {}, 'Cannot delete order');
    } else {
      return sendSuccess(res, order);
    }
  });
}







// ADD AN ORDER ITEM
exports.addOrderItem = (req, res, next) => {
  const orderItem = new OrderItem(req.body);

  orderItem.save((err, orderItem) => {
    if (err) {
      return sendError(res, {}, 'Server failed');
    } else {
      Order.findByIdAndUpdate(req.params.id).populate('orderItem').exec((err, callbackOrder) => {
          if(err || !callbackOrder){
            return res.status(400).json({
              error:'Order not found'
            });
          } else {
            callbackOrder.orderItem.push(orderItem)

            Product.findById(req.body.productId, function (err, product) {
              if (err || !product) {
                return sendError(res, err, 'Cannot get product')
              } else {
                orderItem.total = product.price * orderItem.qty;
                orderItem.credit = 'false';

                callbackOrder.totalPrice = callbackOrder.totalPrice + orderItem.total;

                orderItem.save();
                callbackOrder.save();
                return sendSuccess(res, callbackOrder)
              }
            });

            // return sendSuccess(res, callbackOrder);
          }
        })
      }
  });
};