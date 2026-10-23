import { Module } from '@nestjs/common';
import { CartController } from './cart/cart.controller.js';
import { CartService } from './cart/cart.service.js';
import { AddressesController } from './addresses/addresses.controller.js';
import { CheckoutController } from './checkout/checkout.controller.js';
import { CheckoutService } from './checkout/checkout.service.js';
import { PaymentsController } from './payments/payments.controller.js';
import { PaymentsService } from './payments/payments.service.js';
import { OrdersController } from './orders/orders.controller.js';
import { OrderWorkflowService } from './orders/order-workflow.service.js';
import { ReviewsController } from './reviews/reviews.controller.js';
import { NotificationsController } from './notifications/notifications.controller.js';

/** Alur belanja: keranjang -> checkout -> pembayaran -> pesanan -> ulasan */
@Module({
  controllers: [CartController, AddressesController, CheckoutController, PaymentsController, OrdersController, ReviewsController, NotificationsController],
  providers: [CartService, CheckoutService, PaymentsService, OrderWorkflowService],
  exports: [OrderWorkflowService, PaymentsService],
})
export class CommerceModule {}
