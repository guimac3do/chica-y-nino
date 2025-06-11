import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Form validation schema
const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  gender_id: z.string().min(1, 'Gênero é obrigatório'),
  marca: z.string().optional(),
  data_inicio: z.date(),
  data_fim: z.date(),
});

type FormValues = z.infer<typeof formSchema>;

interface DialogState {
  isOpen: boolean;
  campaignId: number | null;
}

export interface Campaign {
  id: number;
  nome: string;
  gender_id: number;
  marca: string;
  data_inicio: string;
  data_fim: string;
  status?: string;
}

const CampaignForm: React.FC = () => {
  const navigate = useNavigate();
  const [dialogState, setDialogState] = React.useState<DialogState>({
    isOpen: false,
    campaignId: null,
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [showStartDateCalendar, setShowStartDateCalendar] = React.useState(false); // Novo estado
  const [showEndDateCalendar, setShowEndDateCalendar] = React.useState(false);     // Novo estado

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      gender_id: '',
      marca: '',
      data_inicio: new Date(),
      data_fim: new Date(),
    },
  });

  const API_URL = "http://localhost:8002/api";

  // Watch for changes in the marca field
  const marca = form.watch('marca');

  // Update nome when marca changes
  useEffect(() => {
    if (marca) {
      const campaignName = `Campanha da ${marca}`;
      form.setValue('nome', campaignName);
    }
  }, [marca, form]);

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      const formattedData = {
        ...data,
        gender_id: parseInt(data.gender_id),
        data_inicio: format(data.data_inicio, 'yyyy-MM-dd'),
        data_fim: format(data.data_fim, 'yyyy-MM-dd'),
      };

      const response = await axios.post<Campaign>(`${API_URL}/criar-campanha`, formattedData);

      setDialogState({
        isOpen: true,
        campaignId: response.data.id,
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCampaign = () => {
    if (dialogState.campaignId) {
      navigate(`/admin/campanha/${dialogState.campaignId}`);
    }
  };

  const handleCloseDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Nova Campanha</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="marca"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Campanha</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gênero</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Masculino</SelectItem>
                    <SelectItem value="2">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_inicio"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Início</FormLabel>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full pl-3 text-left font-normal"
                    type="button"
                    onClick={() => setShowStartDateCalendar(!showStartDateCalendar)}
                  >
                    {field.value ? (
                      format(field.value, 'dd/MM/yyyy')
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                  {showStartDateCalendar && (
                    <div className="absolute z-10 top-full left-0 mt-1 border rounded-md shadow-lg bg-white p-2">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date);
                            setShowStartDateCalendar(false); // Fecha o calendário após selecionar
                          }
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_fim"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Término</FormLabel>
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full pl-3 text-left font-normal"
                    type="button"
                    onClick={() => setShowEndDateCalendar(!showEndDateCalendar)}
                  >
                    {field.value ? (
                      format(field.value, 'dd/MM/yyyy')
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                  {showEndDateCalendar && (
                    <div className="absolute z-10 top-full left-0 mt-1 border rounded-md shadow-lg bg-white p-2">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date);
                            setShowEndDateCalendar(false); // Fecha o calendário após selecionar
                          }
                        }}
                        disabled={(date) =>
                          date < form.getValues('data_inicio')
                        }
                        initialFocus
                      />
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Criando...' : 'Criar Campanha'}
          </Button>
        </form>
      </Form>

      <Dialog open={dialogState.isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Campanha Criada com Sucesso!</DialogTitle>
            <DialogDescription>
              A campanha foi criada com sucesso. Você pode visualizá-la agora ou fechar esta mensagem.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button variant="secondary" onClick={handleCloseDialog}>
              Fechar
            </Button>
            <Button onClick={handleViewCampaign}>
              Ver Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignForm;