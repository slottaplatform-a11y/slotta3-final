"""Slotta Calculation Engine

This module calculates the fair Slotta amount based on:
- Service price and duration
- Client reliability
- Booking patterns
- Slot demand
"""

from datetime import datetime
from typing import Optional

class SlottaEngine:
    
    # Base percentages by service duration
    BASE_PERCENTAGES = {
        'short': 0.275,    # < 60 min: 27.5%
        'medium': 0.325,   # 60-180 min: 32.5%
        'long': 0.40       # 180+ min: 40%
    }
    
    # Modifiers
    MODIFIER_NEW_CLIENT = 0.20        # +20%
    MODIFIER_RELIABLE = -0.20          # -20%
    MODIFIER_NEEDS_PROTECTION = 0.30  # +30%
    MODIFIER_PEAK_SLOT = 0.15         # +15%
    MODIFIER_CANCELLATION_HISTORY = 0.30  # +30%
    
    # Limits
    MAX_PERCENTAGE = 0.70  # Never exceed 70% of service price
    MIN_AMOUNT = 10.0      # Minimum €10 for long services
    
    @classmethod
    def calculate_base_slotta(cls, price: float, duration_minutes: int) -> float:
        """Calculate base Slotta based on service price and duration"""
        
        if duration_minutes < 60:
            percentage = cls.BASE_PERCENTAGES['short']
        elif duration_minutes <= 180:
            percentage = cls.BASE_PERCENTAGES['medium']
        else:
            percentage = cls.BASE_PERCENTAGES['long']
        
        return price * percentage
    
    @classmethod
    def calculate_slotta(
        cls,
        price: float,
        duration_minutes: int,
        client_reliability: str = 'new',
        no_shows: int = 0,
        cancellations: int = 0,
        is_peak_slot: bool = False,
        booking_lead_time_hours: Optional[int] = None
    ) -> float:
        """Calculate final Slotta amount with all modifiers"""
        
        # Start with base
        base = cls.calculate_base_slotta(price, duration_minutes)
        
        # Initialize modifier
        total_modifier = 0.0
        
        # Client reliability modifier
        if client_reliability == 'reliable':
            total_modifier += cls.MODIFIER_RELIABLE
        elif client_reliability == 'new':
            total_modifier += cls.MODIFIER_NEW_CLIENT
        elif client_reliability == 'needs-protection':
            total_modifier += cls.MODIFIER_NEEDS_PROTECTION
        
        # Cancellation history
        if cancellations >= 2:
            total_modifier += cls.MODIFIER_CANCELLATION_HISTORY
        
        # Peak slot demand
        if is_peak_slot:
            total_modifier += cls.MODIFIER_PEAK_SLOT
        
        # Apply modifier
        final_amount = base * (1 + total_modifier)
        
        # Apply limits
        max_allowed = price * cls.MAX_PERCENTAGE
        final_amount = min(final_amount, max_allowed)
        
        # Ensure minimum for long services
        if duration_minutes >= 180:
            final_amount = max(final_amount, cls.MIN_AMOUNT)
        
        # Round to 2 decimals
        return round(final_amount, 2)
    
    @classmethod
    def calculate_no_show_split(cls, slotta_amount: float) -> dict:
        """Calculate how Slotta is split on no-show
        
        Returns:
            dict: {'master_compensation': float, 'client_wallet_credit': float}
        """
        master_portion = slotta_amount * 0.625  # 62.5% to master
        client_portion = slotta_amount * 0.375  # 37.5% to client wallet
        
        return {
            'master_compensation': round(master_portion, 2),
            'client_wallet_credit': round(client_portion, 2)
        }
    
    @classmethod
    def calculate_risk_score(
        cls,
        total_bookings: int,
        completed_bookings: int,
        no_shows: int,
        cancellations: int,
        booking_lead_time_hours: Optional[int] = None
    ) -> int:
        """Calculate risk score 0-100 (higher = more risky)"""
        
        if total_bookings == 0:
            # New client - moderate risk
            return 50
        
        # Calculate no-show rate
        no_show_rate = no_shows / total_bookings if total_bookings > 0 else 0
        cancellation_rate = cancellations / total_bookings if total_bookings > 0 else 0
        
        # Base score from no-shows (0-60 points)
        risk_score = no_show_rate * 60
        
        # Add cancellation impact (0-20 points)
        risk_score += cancellation_rate * 20
        
        # Short lead time increases risk (0-20 points)
        if booking_lead_time_hours and booking_lead_time_hours < 24:
            risk_score += 20 * (1 - booking_lead_time_hours / 24)
        
        # Cap at 100
        return int(min(risk_score, 100))
    
    @classmethod
    def determine_reliability(
        cls,
        total_bookings: int,
        no_shows: int
    ) -> str:
        """Determine client reliability tag"""
        
        if total_bookings == 0:
            return 'new'
        
        if no_shows >= 2:
            return 'needs-protection'
        
        if no_shows <= 1 and total_bookings >= 3:
            return 'reliable'
        
        return 'new'
