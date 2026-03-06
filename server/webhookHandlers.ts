import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const stripe = await getUncachableStripeClient();
      const event = JSON.parse(payload.toString());

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        if (session.metadata?.charge_id && session.payment_status === 'paid') {
          const chargeId = parseInt(session.metadata.charge_id);
          const charge = await storage.getAccountChargeById(chargeId);

          if (charge && charge.status === 'pending_payment') {
            await storage.updateAccountChargeStatus(chargeId, 'paid', new Date());
            if (session.payment_intent) {
              await storage.updateAccountChargePaymentIntent(chargeId, session.payment_intent);
            }

            const account = await storage.getAccountById(charge.accountId);
            if (account) {
              // Automatically add the amount to the account balance
              await storage.updateAccountBalance(account.id, charge.amount);

              // Create transaction record for the deposit
              await storage.createTransaction({
                accountId: account.id,
                amount: charge.amount,
                description: `Recarga por pasarela: ${charge.reason}`,
                date: new Date(),
                type: "deposit",
                reference: session.payment_intent as string || `STRIPE-${chargeId}`,
                recipientId: null
              });
              
              const remainingCharges = await storage.getAccountChargesByAccountId(charge.accountId);
              const hasPendingCharges = remainingCharges.some((c: any) => c.id !== chargeId && c.status === 'pending_payment');
              if (!hasPendingCharges && account.status === 'BLOQUEADA') {
                await storage.updateAccountStatus(charge.accountId, 'ACTIVA', '');
              }

              await storage.createCardNotification({
                userId: account.userId,
                cardId: null,
                type: 'payment_confirmed',
                message: `Pago confirmado: ${charge.reason} - $${charge.amount} ${charge.currency}`,
                read: 0
              });
            }

            if ((global as any).broadcastAdminNotification) {
              (global as any).broadcastAdminNotification(
                `[PAGO] Webhook: Pago Stripe confirmado para cobro #${chargeId}: $${charge.amount} ${charge.currency}`
              );
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error processing charge webhook:", error.message);
    }
  }
}
