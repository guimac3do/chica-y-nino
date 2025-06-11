import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  X, 
  Calendar as CalendarIcon,
  ChevronDown,
  MoreHorizontal,
  Tag,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";

interface Campanha {
  id: number;
  nome: string;
  gender_id: number;
  data_inicio: string;
  data_fim: string;
  marca: string;
}

const API_URL = "http://localhost:8002/api";

export default function Campanhas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [newCampanha, setNewCampanha] = useState<Campanha>({
    nome: "",
    gender_id: 1,
    data_inicio: "",
    data_fim: "",
    id: 0,
    marca: "Sem marca",
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({
    startDate: undefined,
    endDate: undefined,
  });
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [showStartDateCalendar, setShowStartDateCalendar] = useState(false);
const [showEndDateCalendar, setShowEndDateCalendar] = useState(false);

  const handleRemoveDateFilter = () => {
    setDateFilter({ startDate: undefined, endDate: undefined });
    setColumnFilters(prev => prev.filter(filter => filter.id !== "data_inicio"));
  };

  const handleRemoveGenderFilter = () => {
    setGenderFilter("");
    setColumnFilters(prev => prev.filter(filter => filter.id !== "gender_id"));
  };

  const AdvancedFilters = () => {
    const handleContentClick = (e: React.MouseEvent) => {
      e.stopPropagation();
    };
    return (
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="ml-2">
            <Filter className="mr-2 h-4 w-4" />
            Filtros Avançados
          </Button>
        </SheetTrigger>
        <SheetContent onClick={handleContentClick}>
          <SheetHeader>
            <SheetTitle>Filtros Avançados</SheetTitle>
            <SheetDescription>
              Aplique filtros específicos para refinar sua busca
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Inicial</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateFilter.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter.startDate ? (
                          format(dateFilter.startDate, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFilter.startDate}
                        onSelect={(date) => 
                          setDateFilter(prev => ({ ...prev, startDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Data Final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateFilter.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter.endDate ? (
                          format(dateFilter.endDate, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFilter.endDate}
                        onSelect={(date) => 
                          setDateFilter(prev => ({ ...prev, endDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gênero</label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gênero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Menino</SelectItem>
                  <SelectItem value="2">Menina</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFilter({ startDate: undefined, endDate: undefined });
                  setGenderFilter("");
                  setColumnFilters([]);
                }}
              >
                Limpar Filtros
              </Button>
              <Button
                onClick={() => {
                  const newFilters: ColumnFiltersState = [];
                  if (dateFilter.startDate && dateFilter.endDate) {
                    newFilters.push({
                      id: "data_inicio",
                      value: {
                        startDate: dateFilter.startDate.toISOString().split("T")[0],
                        endDate: dateFilter.endDate.toISOString().split("T")[0],
                      },
                    });
                  }
                  if (genderFilter) {
                    newFilters.push({
                      id: "gender_id",
                      value: parseInt(genderFilter, 10),
                    });
                  }
                  setColumnFilters(newFilters);
                  setFilterOpen(false);
                }}
              >
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  useEffect(() => {
    fetchCampanhas();
  }, []);

  useEffect(() => {
    setNewCampanha(prev => ({
      ...prev,
      data_inicio: dataInicio ? format(dataInicio, 'yyyy-MM-dd') : '',
    }));
  }, [dataInicio]);

  useEffect(() => {
    setNewCampanha(prev => ({
      ...prev,
      data_fim: dataFim ? format(dataFim, 'yyyy-MM-dd') : '',
    }));
  }, [dataFim]);

  const fetchCampanhas = async () => {
    try {
      const response = await axios.get(`${API_URL}/campanhas`);
      setCampanhas(response.data);
    } catch (error) {
      console.error("Erro ao buscar campanhas", error);
    }
  };

  const handleCreateCampanha = async () => {
    try {
      await axios.post(`${API_URL}/campanhas`, newCampanha);
      setModalOpen(false);
      setNewCampanha({
        nome: "",
        gender_id: 1,
        data_inicio: "",
        data_fim: "",
        id: 0,
        marca: "Sem marca",
      });
      setDataInicio(undefined);
      setDataFim(undefined);
      fetchCampanhas();
      toast({
        title: "Sucesso",
        description: "Campanha criada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao criar campanha", error);
      toast({
        title: "Erro",
        description: "Falha ao criar a campanha.",
        variant: "destructive",
      });
    }
  };

  const handleEditCampanha = async () => {
    try {
      const updatedCampanha = {
        nome: newCampanha.nome,
        gender_id: newCampanha.gender_id,
        marca: newCampanha.marca,
        data_inicio: dataInicio ? format(dataInicio, 'yyyy-MM-dd') : newCampanha.data_inicio,
        data_fim: dataFim ? format(dataFim, 'yyyy-MM-dd') : newCampanha.data_fim,
      };
      await axios.put(`${API_URL}/campanhas/${newCampanha.id}`, updatedCampanha);
      setModalOpen(false);
      setNewCampanha({
        nome: "",
        gender_id: 1,
        data_inicio: "",
        data_fim: "",
        id: 0,
        marca: "Sem marca",
      });
      setDataInicio(undefined);
      setDataFim(undefined);
      setIsEditing(false);
      fetchCampanhas();
      toast({
        title: "Sucesso",
        description: "Campanha atualizada com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao atualizar campanha", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar a campanha.",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (campanha: Campanha) => {
    setNewCampanha(campanha);
    setDataInicio(new Date(campanha.data_inicio));
    setDataFim(new Date(campanha.data_fim));
    setIsEditing(true);
    setModalOpen(true);
  };

  const columns: ColumnDef<Campanha>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value: any) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: any) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.getValue("nome")}
        </div>
      ),
    },
    {
      accessorKey: "marca",
      header: "Marca",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          {row.getValue("marca")}
        </div>
      ),
    },
    {
      accessorKey: "gender_id",
      header: "Gênero",
      cell: ({ row }) => {
        const gender = row.getValue("gender_id") as number;
        return (
          <Badge
            variant="outline"
            className={
              gender === 1
                ? "bg-blue-100 text-blue-800"
                : "bg-pink-100 text-pink-800"
            }
          >
            {gender === 1 ? "Menino" : "Menina"}
          </Badge>
        );
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue) return true;
        return row.getValue(id) === filterValue;
      },
    },
    {
      accessorKey: "data_inicio",
      header: "Data Início",
      cell: ({ row }) => <div>{format(new Date(row.getValue("data_inicio")), "dd MMM", { locale: ptBR })}</div>,
      filterFn: (row, id, filterValue: { startDate: string; endDate: string }) => {
        if (!filterValue.startDate || !filterValue.endDate) return true;
        const rowDate = new Date(row.getValue(id));
        const startDate = new Date(filterValue.startDate);
        const endDate = new Date(filterValue.endDate);
        return rowDate >= startDate && rowDate <= endDate;
      },
    },
    {
      accessorKey: "data_fim",
      header: "Data Fim",
      cell: ({ row }) => <div>{format(new Date(row.getValue("data_fim")), "dd MMM", { locale: ptBR })}</div>,
    },
    {
      accessorKey: "acoes",
      header: "Ações",
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const campanha = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/admin/produtos?campanhaId=${campanha.id}`)}>
                Ver produtos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditModal(campanha)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Exportar dados</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: campanhas,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const handleRowClick = (campanhaId: number) => {
    navigate(`/admin/campanha/${campanhaId}`);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between pb-4">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Filtrar campanhas..."
            value={(table.getColumn("nome")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("nome")?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
          <AdvancedFilters />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Colunas <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(dateFilter.startDate || dateFilter.endDate || genderFilter) && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {dateFilter.startDate && dateFilter.endDate && (
              <Badge variant="secondary" className="flex gap-2 items-center">
                <span>
                  {format(dateFilter.startDate, "dd/MM/yyyy")} - {format(dateFilter.endDate, "dd/MM/yyyy")}
                </span>
                <X className="h-3 w-3 cursor-pointer" onClick={handleRemoveDateFilter} />
              </Badge>
            )}
            {genderFilter && (
              <Badge variant="secondary" className="flex gap-2 items-center">
                <span>{genderFilter === "1" ? "Menino" : "Menina"}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={handleRemoveGenderFilter} />
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button onClick={() => {
            setIsEditing(false);
            setNewCampanha({
              nome: "",
              gender_id: 1,
              data_inicio: "",
              data_fim: "",
              id: 0,
              marca: "Sem marca",
            });
            setDataInicio(undefined);
            setDataFim(undefined);
            setModalOpen(true);
          }}>
            Adicionar Campanha
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('[role="checkbox"]') || 
                      target.closest('[role="menuitem"]') ||
                      target.closest('button')
                    ) {
                      return;
                    }
                    handleRowClick(row.original.id);
                  }}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} linha(s)
          selecionada(s).
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => table.nextPage()} 
            disabled={!table.getCanNextPage()}
          >
            Próxima
          </Button>
        </div>
      </div>
      
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
  <DialogContent className="p-0 max-w-xl">
    <Card className="border-0">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{isEditing ? "Editar Campanha" : "Adicionar Campanha"}</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome da campanha</label>
          <Input 
            className="w-full" 
            placeholder="Nome da campanha" 
            value={newCampanha.nome}
            onChange={(e) => setNewCampanha({ ...newCampanha, nome: e.target.value })}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 relative">
            <label className="text-sm font-medium">Data Início</label>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dataInicio && "text-muted-foreground"
              )}
              onClick={() => setShowStartDateCalendar(!showStartDateCalendar)}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dataInicio ? (
                format(dataInicio, "PPP", { locale: ptBR })
              ) : (
                <span>Selecione a data</span>
              )}
            </Button>
            {showStartDateCalendar && (
              <div className="absolute z-10 top-full left-0 mt-1 border rounded-md shadow-lg bg-white p-2">
                <Calendar
                  mode="single"
                  selected={dataInicio}
                  onSelect={(date) => {
                    setDataInicio(date);
                    setShowStartDateCalendar(false); // Fecha o calendário após selecionar
                  }}
                  initialFocus
                />
              </div>
            )}
          </div>
          <div className="space-y-2 relative">
            <label className="text-sm font-medium">Data Fim</label>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dataFim && "text-muted-foreground"
              )}
              onClick={() => setShowEndDateCalendar(!showEndDateCalendar)}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dataFim ? (
                format(dataFim, "PPP", { locale: ptBR })
              ) : (
                <span>Selecione a data</span>
              )}
            </Button>
            {showEndDateCalendar && (
              <div className="absolute z-10 top-full left-0 mt-1 border rounded-md shadow-lg bg-white p-2">
                <Calendar
                  mode="single"
                  selected={dataFim}
                  onSelect={(date) => {
                    setDataFim(date);
                    setShowEndDateCalendar(false); // Fecha o calendário após selecionar
                  }}
                  initialFocus
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Gênero</label>
            <Select 
              value={newCampanha.gender_id.toString()}
              onValueChange={(value) => setNewCampanha({ ...newCampanha, gender_id: parseInt(value, 10)} )}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione o gênero" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Menino</SelectItem>
                <SelectItem value="2">Menina</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da marca</label>
            <Input 
              className="w-full" 
              placeholder="Nome da marca" 
              value={newCampanha.marca}
              onChange={(e) => setNewCampanha({ ...newCampanha, marca: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => setModalOpen(false)}>
          Cancelar
        </Button>
        <Button onClick={isEditing ? handleEditCampanha : handleCreateCampanha}>
          {isEditing ? "Salvar" : "Criar Campanha"}
        </Button>
      </CardFooter>
    </Card>
  </DialogContent>
</Dialog>
    </div>
  );
}