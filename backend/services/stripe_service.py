"""Stripe Connect Integration

Stripe Connect allows Slotta to:
1. Authorize payment holds (not charges)
2. Capture holds on no-show
3. Release holds on completion
4. Pay out masters automatically

To enable:
1. Create Stripe account at https://stripe.com
2. Go to Developers > API Keys
3. Add to .env:
   - STRIPE_SECRET_KEY=sk_test_...
   - STRIPE_PUBLISHABLE_KEY=pk_test_...
4. Enable Connect: https://dashboard.stripe.com/connect/overview
"""

import os
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)
from logging_utils import log_info, log_error

class StripeService:
    
    def __init__(self):
        self.secret_key = os.getenv('STRIPE_SECRET_KEY')
        self.enabled = bool(self.secret_key)
        
        if self.enabled:
            import stripe
            stripe.api_key = self.secret_key
            log_info(logger, "stripe_enabled")
        else:
            log_error(logger, "stripe_disabled", reason="missing_secret_key")
    
    async def create_payment_intent(
        self,
        amount: float,
        customer_email: str,
        metadata: dict
    ) -> Optional[Dict]:
        """Create a payment intent with authorization hold"""
        
        if not self.enabled:
            log_info(logger, "stripe_payment_intent_mock", amount=amount)
            return {
                'id': 'pi_mock_123456',
                'client_secret': 'pi_mock_123456_secret_mock',
                'status': 'requires_payment_method'
            }
        
        try:
            import stripe
            
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency='eur',
                capture_method='manual',  # CRITICAL: Hold, don't charge
                receipt_email=customer_email,
                metadata=metadata,
                automatic_payment_methods={
                    'enabled': True,
                    'allow_redirects': 'never'  # Prevent redirect-based payment methods
                }
            )
            
            log_info(logger, "stripe_payment_intent_created", payment_intent_id=intent.id)
            return {
                'id': intent.id,
                'client_secret': intent.client_secret,
                'status': intent.status
            }
            
        except Exception as e:
            log_error(logger, "stripe_payment_intent_failed", error=str(e))
            return None
    
    async def capture_payment(
        self,
        payment_intent_id: str,
        amount: Optional[float] = None
    ) -> bool:
        """Capture a held payment (on no-show)"""
        
        if not self.enabled:
            log_info(logger, "stripe_capture_mock", payment_intent_id=payment_intent_id)
            return True
        
        try:
            import stripe
            
            capture_args = {}
            if amount:
                capture_args['amount_to_capture'] = int(amount * 100)
            
            intent = stripe.PaymentIntent.capture(
                payment_intent_id,
                **capture_args
            )
            
            log_info(logger, "stripe_captured", payment_intent_id=payment_intent_id)
            return True
            
        except Exception as e:
            log_error(logger, "stripe_capture_failed", error=str(e))
            return False
    
    async def cancel_payment(
        self,
        payment_intent_id: str
    ) -> bool:
        """Cancel/release a payment hold (on completion)"""
        
        if not self.enabled:
            log_info(logger, "stripe_cancel_mock", payment_intent_id=payment_intent_id)
            return True
        
        try:
            import stripe
            
            intent = stripe.PaymentIntent.cancel(payment_intent_id)
            
            log_info(logger, "stripe_cancelled", payment_intent_id=payment_intent_id)
            return True
            
        except Exception as e:
            log_error(logger, "stripe_cancel_failed", error=str(e))
            return False
    
    async def create_payout(
        self,
        connected_account_id: str,
        amount: float
    ) -> bool:
        """Create payout to master's connected account"""
        
        if not self.enabled:
            log_info(logger, "stripe_payout_mock", amount=amount, account_id=connected_account_id)
            return True
        
        try:
            import stripe
            
            payout = stripe.Payout.create(
                amount=int(amount * 100),
                currency='eur',
                stripe_account=connected_account_id
            )
            
            log_info(logger, "stripe_payout_created", payout_id=payout.id)
            return True
            
        except Exception as e:
            log_error(logger, "stripe_payout_failed", error=str(e))
            return False

# Global instance
stripe_service = StripeService()
