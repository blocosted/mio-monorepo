import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Star, Music } from "lucide-react"

import { Badge } from "../primitives/badge"
import { Button } from "../primitives/button"
import {
  SelectableCard,
  SelectableCardTitle,
  SelectableCardDescription,
} from "./selectable-card"

const meta: Meta<typeof SelectableCard> = {
  title: "Composite/SelectableCard",
  component: SelectableCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState(false)
    return (
      <div className="w-80">
        <SelectableCard
          selected={selected}
          onSelect={() => setSelected(!selected)}
        >
          <SelectableCardTitle>Option Title</SelectableCardTitle>
          <SelectableCardDescription>
            <span className="text-muted-foreground">
              Description text goes here
            </span>
          </SelectableCardDescription>
        </SelectableCard>
      </div>
    )
  },
}

export const WithAction: Story = {
  render: () => {
    const [selected, setSelected] = useState(false)
    return (
      <div className="w-80">
        <SelectableCard
          selected={selected}
          onSelect={() => setSelected(!selected)}
          action={<Button variant="ghost" size="icon"><Music className="h-4 w-4" /></Button>}
        >
          <SelectableCardTitle>Voice Name</SelectableCardTitle>
          <SelectableCardDescription>
            <Badge variant="outline">female</Badge>
            <Badge variant="outline">young</Badge>
          </SelectableCardDescription>
        </SelectableCard>
      </div>
    )
  },
}

export const WithBadges: Story = {
  render: () => {
    const [selected, setSelected] = useState(true)
    return (
      <div className="w-80">
        <SelectableCard
          selected={selected}
          onSelect={() => setSelected(!selected)}
        >
          <div className="flex items-center gap-2">
            <SelectableCardTitle>Premium Option</SelectableCardTitle>
            <Star className="h-3 w-3 text-amber-500" />
          </div>
          <SelectableCardDescription>
            <Badge variant="outline">Category</Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              85%
            </Badge>
          </SelectableCardDescription>
        </SelectableCard>
      </div>
    )
  },
}

export const SmallSize: Story = {
  render: () => {
    const [selected, setSelected] = useState(false)
    return (
      <div className="w-64">
        <SelectableCard
          size="sm"
          selected={selected}
          onSelect={() => setSelected(!selected)}
        >
          <SelectableCardTitle>Compact Option</SelectableCardTitle>
          <SelectableCardDescription>
            <Badge variant="outline" className="text-xs">tag</Badge>
          </SelectableCardDescription>
        </SelectableCard>
      </div>
    )
  },
}

export const MultipleOptions: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>("opt-1")
    const options = [
      { id: "opt-1", name: "Option One", tags: ["fast", "reliable"] },
      { id: "opt-2", name: "Option Two", tags: ["cheap"] },
      { id: "opt-3", name: "Option Three", tags: ["premium", "featured"] },
    ]

    return (
      <div className="w-80 space-y-2">
        {options.map((opt) => (
          <SelectableCard
            key={opt.id}
            selected={selectedId === opt.id}
            onSelect={() => setSelectedId(opt.id)}
          >
            <SelectableCardTitle>{opt.name}</SelectableCardTitle>
            <SelectableCardDescription>
              {opt.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </SelectableCardDescription>
          </SelectableCard>
        ))}
      </div>
    )
  },
}
