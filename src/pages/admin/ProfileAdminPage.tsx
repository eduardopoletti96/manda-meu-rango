import { useRestaurant } from '@/features/restaurant/restaurant-context'
import { BrandingCard } from '@/features/restaurant/profile/BrandingCard'
import { BasicInfoCard } from '@/features/restaurant/profile/BasicInfoCard'
import { AddressCard } from '@/features/restaurant/profile/AddressCard'
import { FulfillmentCard } from '@/features/restaurant/profile/FulfillmentCard'
import { BusinessHoursCard } from '@/features/restaurant/profile/BusinessHoursCard'

export function ProfileAdminPage() {
  const { restaurant, refresh } = useRestaurant()

  // O AdminLayout garante restaurante carregado antes de renderizar as rotas.
  if (!restaurant) {
    return null
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <BrandingCard restaurant={restaurant} onSaved={refresh} />
      <BasicInfoCard restaurant={restaurant} onSaved={refresh} />
      <AddressCard restaurant={restaurant} onSaved={refresh} />
      <FulfillmentCard restaurant={restaurant} onSaved={refresh} />
      <BusinessHoursCard restaurantId={restaurant.id} />
    </div>
  )
}
