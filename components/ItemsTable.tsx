"use client"
import { Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ItemRow } from "./ItemRow"
import { useBill } from "@/contexts/BillContext"
import type { Item } from "@/contexts/BillContext"

export function ItemsTable() {
  const { state, dispatch } = useBill()

  const handleAddItem = () => {
    const newItem: Omit<Item, "id"> = {
      name: "",
      price: 0,
      splitWith: state.currentBill.people.map((p) => p.id), // Default to all people
      method: "even",
      customSplits: {},
    }
    dispatch({ type: "ADD_ITEM", payload: newItem })
  }

  const handleUpdateItem = (updatedItem: Item) => {
    dispatch({ type: "UPDATE_ITEM", payload: updatedItem })
  }

  const handleDeleteItem = (itemId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Items ({state.currentBill.items.length})
          </CardTitle>
          <Button onClick={handleAddItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.currentBill.items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-2">No items added yet</p>
            <p className="text-xs mb-4">Add items to start splitting expenses</p>
            <Button onClick={handleAddItem} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Item
            </Button>
          </div>
        ) : (
          <>
            {state.currentBill.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                people={state.currentBill.people}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}
