import React, { useState, useEffect } from 'react';
import { MasterLayout } from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash, Shield, Clock, DollarSign } from 'lucide-react';
import { servicesAPI, authAPI } from '@/lib/api';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const master = authAPI.getMaster();
  const masterId = master?.id;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    price: '',
  });

  // Load services
  const loadServices = async () => {
    if (!masterId) return;
    try {
      setLoading(true);
      const response = await servicesAPI.getByMaster(masterId, false);
      setServices(response.data || []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (masterId) {
      loadServices();
    }
  }, [masterId]);

  // Calculate Slotta amount based on duration and price
  const calculateSlotta = (price, durationMinutes) => {
    let percentage;
    if (durationMinutes < 60) {
      percentage = 0.275; // 27.5%
    } else if (durationMinutes <= 180) {
      percentage = 0.325; // 32.5%
    } else {
      percentage = 0.40; // 40%
    }
    return Math.round(price * percentage);
  };

  // Handle form submit (Add)
  const handleAdd = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.create({
        master_id: masterId,
        ...formData,
      });
      setServices([...services, response.data]);
      setShowAddModal(false);
      resetForm();
      alert('✅ Service added successfully!');
    } catch (error) {
      console.error('Failed to add service:', error);
      alert('❌ Failed to add service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submit (Edit)
  const handleEdit = async () => {
    try {
      setLoading(true);
      const response = await servicesAPI.update(editingService.id, formData);
      setServices(services.map(s => s.id === editingService.id ? response.data : s));
      setShowEditModal(false);
      resetForm();
      alert('✅ Service updated successfully!');
    } catch (error) {
      console.error('Failed to update service:', error);
      alert('❌ Failed to update service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      setLoading(true);
      await servicesAPI.delete(id);
      setServices(services.filter(s => s.id !== id));
      alert('✅ Service deleted successfully!');
    } catch (error) {
      console.error('Failed to delete service:', error);
      alert('❌ Failed to delete service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price,
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: 60,
      price: '',
    });
    setEditingService(null);
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  // Calculate estimated Slotta for form
  const estimatedSlotta = calculateSlotta(formData.price, formData.duration_minutes);

  return (
    <MasterLayout active="services" title="Services & Slotta Rules">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Manage Your Services</h2>
          <p className="text-gray-600">Set prices, duration, and Slotta protection for each service</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)} 
          data-testid="add-service-btn"
          disabled={loading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Services List */}
      <div className="space-y-4 mb-8">
        {services.map((service) => (
          <Card key={service.id} className={!service.active ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold" data-testid={`service-name-${service.id}`}>
                      {service.name}
                    </h3>
                    {!service.active && <Badge variant="default">Inactive</Badge>}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <div className="flex items-center space-x-2 text-gray-600 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Duration</span>
                      </div>
                      <div className="font-semibold">{formatDuration(service.duration_minutes)}</div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-gray-600 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">Price</span>
                      </div>
                      <div className="font-semibold text-lg">€{service.price}</div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 text-purple-600 mb-1">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-medium">Slotta</span>
                      </div>
                      <div className="font-bold text-lg text-purple-600">€{service.base_slotta}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {((service.base_slotta / service.price) * 100).toFixed(0)}% of price
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openEditModal(service)}
                    data-testid={`edit-service-${service.id}`}
                    disabled={loading}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(service.id)}
                    disabled={loading}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Slotta Rules Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How Slotta is Calculated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Base Formula</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Short services (&lt; 1 hour)</span>
                  <span className="font-semibold">25-30% of price</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Medium (1-3 hours)</span>
                  <span className="font-semibold">30-35% of price</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Long (3+ hours)</span>
                  <span className="font-semibold">35-45% of price</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Adjustments</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">New client</span>
                  <Badge variant="warning">+20%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Reliable client</span>
                  <Badge variant="success">-20%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Peak slot demand</span>
                  <Badge variant="info">+15%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cancellation history</span>
                  <Badge variant="danger">+30%</Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-900">
              <strong>Note:</strong> Slotta never exceeds 70% of service price or drops below €10 for long services.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Service Modal */}
      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                placeholder="e.g., Balayage Hair Color"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the service"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={String(formData.duration_minutes)}
                  onValueChange={(value) =>
                    setFormData({ ...formData, duration_minutes: parseInt(value, 10) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="150">2.5 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="300">5 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Price (€)</Label>
                <Input
                  type="number"
                  placeholder="150"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">Estimated Slotta Protection:</span>
                <span className="text-2xl font-bold text-purple-600">€{estimatedSlotta}</span>
              </div>
              <p className="text-xs text-purple-700">
                This is the base amount. It adjusts based on client reliability and booking patterns.
              </p>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdd}
                className="flex-1"
                disabled={loading || !formData.name || !formData.price || formData.price <= 0}
                data-testid="submit-add-service"
              >
                {loading ? 'Adding...' : 'Add Service'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog
        open={showEditModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowEditModal(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                placeholder="e.g., Balayage Hair Color"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the service"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={String(formData.duration_minutes)}
                  onValueChange={(value) =>
                    setFormData({ ...formData, duration_minutes: parseInt(value, 10) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="150">2.5 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="300">5 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Price (€)</Label>
                <Input
                  type="number"
                  placeholder="150"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">Updated Slotta Protection:</span>
                <span className="text-2xl font-bold text-purple-600">€{estimatedSlotta}</span>
              </div>
              <p className="text-xs text-purple-700">
                Existing bookings keep their original Slotta amount.
              </p>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                className="flex-1"
                disabled={loading || !formData.name || !formData.price || formData.price <= 0}
                data-testid="submit-edit-service"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
};

export default Services;
