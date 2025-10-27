import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import type { QueueWithAnswerCount } from "~/lib/types/ui-types";

interface QueueSelectorProps {
  queues: QueueWithAnswerCount[];
  selectedQueueId: string | null;
  onQueueSelect: (queueId: string | null) => void;
  placeholder?: string;
}

export function QueueSelector({
  queues,
  selectedQueueId,
  onQueueSelect,
  placeholder = "Select a queue...",
}: QueueSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedQueue = useMemo(() => {
    return queues.find((queue) => queue.queue_id === selectedQueueId);
  }, [queues, selectedQueueId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          {selectedQueue ? (
            <span className="truncate">{selectedQueue.queue_id}</span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search queues..." />
          <CommandList>
            <CommandEmpty>No queues found.</CommandEmpty>
            <CommandGroup>
              {queues.map((queue) => (
                <CommandItem
                  key={queue.queue_id}
                  value={queue.queue_id}
                  onSelect={() => {
                    onQueueSelect(queue.queue_id);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedQueueId === queue.queue_id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="truncate">{queue.queue_id}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
